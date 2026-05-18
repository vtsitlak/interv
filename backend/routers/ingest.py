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
        scraped = await scrape_all_links(link_dicts)
        skipped = len(link_dicts) - len(scraped)

        count = ingest_profile(profile_id, cv_text, qa_dicts, scraped)

        try:
            skills = await extract_skills_from_cv(cv_text)
            if skills:

                def _save_skills() -> None:
                    firestore.client().collection('profiles').document(
                        profile_id
                    ).set({'skills': skills}, merge=True)

                await asyncio.to_thread(_save_skills)
        except Exception as exc:  # noqa: BLE001
            logger.warning('Skill extraction failed for %s', profile_id)

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
