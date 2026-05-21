import asyncio
import logging
from typing import Annotated, List, Optional

from fastapi import APIRouter, Header, HTTPException
from firebase_admin import firestore
from pydantic import BaseModel, Field

from services.api_limits import (
    MAX_CV_CHARS,
    MAX_LINK_DESC_CHARS,
    MAX_LINK_URL_CHARS,
    MAX_QA_ANSWER_CHARS,
    MAX_QA_QUESTION_CHARS,
)
from services.auth import verify_profile_owner_token
from services.career_overview import generate_career_overview
from services.link_scraper import is_linkedin, scrape_all_links
from services.rag import ingest_profile
from services.request_validation import validate_ingest_payload
from services.skills import extract_skills_from_cv
from services.usage_rate_limit import check_ingest_allowed, record_ingest
from services.vector_store import (
    is_vector_store_available,
    vector_store_unavailable_reason,
)

router = APIRouter(prefix='/ingest', tags=['ingest'])
logger = logging.getLogger(__name__)


class QAPair(BaseModel):
    question: str = Field(default='', max_length=MAX_QA_QUESTION_CHARS)
    answer: str = Field(default='', max_length=MAX_QA_ANSWER_CHARS)


class ProfileLink(BaseModel):
    description: str = Field(default='', max_length=MAX_LINK_DESC_CHARS)
    link: str = Field(default='', max_length=MAX_LINK_URL_CHARS)


class IngestRequest(BaseModel):
    cvText: str = Field(..., max_length=MAX_CV_CHARS)
    personalQA: List[QAPair]
    links: List[ProfileLink] = Field(default_factory=list)


def _load_profile_doc(profile_id: str) -> dict:
    doc = firestore.client().collection('profiles').document(profile_id).get()
    if not doc.exists:
        return {}
    return doc.to_dict() or {}


def _links_for_ingest(
    link_dicts: list[dict], scraped: list[dict]
) -> list[dict[str, str]]:
    """Include scraped URLs plus description-only links (no fetch)."""
    scraped_urls = {
        str(item.get('link') or '').strip() for item in scraped
    }
    merged = list(scraped)
    for link in link_dicts:
        href = str(link.get('link') or '').strip()
        if not href or href in scraped_urls:
            continue
        description = str(link.get('description') or '').strip()
        if not description or is_linkedin(href):
            continue
        merged.append(
            {
                'description': description,
                'link': href,
                'text': description,
            }
        )
    return merged


def _skipped_reason(link_dicts: list[dict], scraped_count: int) -> Optional[str]:
    if not link_dicts:
        return None
    if scraped_count >= len(link_dicts):
        return None
    if any(is_linkedin(item.get('link', '')) for item in link_dicts):
        return (
            'LinkedIn links cannot be scraped automatically — '
            'add your LinkedIn summary to your CV or a Q&A answer instead.'
        )
    return 'Some links could not be fetched; only reachable GitHub and website content was ingested.'


@router.post('/{profile_id}')
async def ingest_profile_route(
    profile_id: str,
    body: IngestRequest,
    authorization: Annotated[str | None, Header()] = None,
):
    verify_profile_owner_token(profile_id, authorization)

    allowed, reason = await check_ingest_allowed(profile_id)
    if not allowed:
        raise HTTPException(status_code=429, detail=reason or 'Rate limit exceeded')

    qa_raw = [{'question': qa.question, 'answer': qa.answer} for qa in body.personalQA]
    link_raw = [
        {'description': link.description, 'link': link.link} for link in body.links
    ]
    cv_text, qa_dicts, link_dicts = validate_ingest_payload(
        body.cvText, qa_raw, link_raw
    )

    try:
        profile_doc = await asyncio.to_thread(_load_profile_doc, profile_id)
        name = str(profile_doc.get('name') or '')
        title = str(profile_doc.get('title') or '')
        summary = str(profile_doc.get('summary') or '')

        scraped = await scrape_all_links(link_dicts)
        links_for_rag = _links_for_ingest(link_dicts, scraped)
        skipped = len(link_dicts) - len(scraped)

        count = ingest_profile(profile_id, cv_text, qa_dicts, links_for_rag)

        skills: list[str] = []
        career_overview = ''
        try:
            skills = await extract_skills_from_cv(
                cv_text,
                title=title,
                summary=summary,
                personal_qa=qa_dicts,
                links=link_dicts,
            )
            career_overview = await generate_career_overview(
                name=name,
                title=title,
                summary=summary,
                cv_text=cv_text,
                personal_qa=qa_dicts,
                links=link_dicts,
                scraped_links=scraped,
                skills=skills,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                'Profile enrichment failed for %s: %s', profile_id, exc
            )

        if skills or career_overview:

            def _save_profile_enrichment() -> None:
                payload: dict = {}
                if skills:
                    payload['skills'] = skills
                if career_overview:
                    payload['careerOverview'] = career_overview
                if payload:
                    firestore.client().collection('profiles').document(
                        profile_id
                    ).set(payload, merge=True)

            await asyncio.to_thread(_save_profile_enrichment)

        await record_ingest(profile_id)

        payload: dict = {
            'status': 'ok',
            'profileId': profile_id,
            'documentsIngested': count,
            'linksScraped': len(scraped),
            'linksSkipped': skipped,
        }
        skipped_reason = _skipped_reason(link_dicts, len(scraped))
        if skipped_reason:
            payload['skippedReason'] = skipped_reason

        if count == 0 and not is_vector_store_available():
            payload['ragEnabled'] = False
            payload['warning'] = (
                vector_store_unavailable_reason()
                or 'Vector store unavailable; profile saved in Firestore only.'
            )
        else:
            payload['ragEnabled'] = True

        return payload
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.exception('Ingest failed for profile %s', profile_id)
        raise HTTPException(status_code=500, detail='Ingest failed') from exc
