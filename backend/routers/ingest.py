import asyncio
import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from firebase_admin import firestore
from pydantic import BaseModel, Field

from services.link_scraper import is_linkedin, scrape_all_links
from services.rag import ingest_profile
from services.skills import extract_skills_from_cv
from services.vector_store import (
    is_vector_store_available,
    vector_store_unavailable_reason,
)

router = APIRouter(prefix="/ingest", tags=["ingest"])
logger = logging.getLogger(__name__)


class QAPair(BaseModel):
    question: str
    answer: str


class ProfileLink(BaseModel):
    description: str = ""
    link: str


class IngestRequest(BaseModel):
    cvText: str
    personalQA: List[QAPair]
    links: List[ProfileLink] = Field(default_factory=list)


def _skipped_reason(link_dicts: list[dict], scraped_count: int) -> Optional[str]:
    if not link_dicts:
        return None
    if scraped_count >= len(link_dicts):
        return None
    if any(is_linkedin(item.get("link", "")) for item in link_dicts):
        return (
            "LinkedIn links cannot be scraped automatically — "
            "add your LinkedIn summary to your CV or a Q&A answer instead."
        )
    return "Some links could not be fetched; only reachable GitHub and website content was ingested."


@router.post("/{profile_id}")
async def ingest_profile_route(profile_id: str, body: IngestRequest):
    try:
        qa_dicts = [
            {"question": qa.question, "answer": qa.answer} for qa in body.personalQA
        ]
        link_dicts = [
            {
                "description": link.description.strip(),
                "link": link.link.strip(),
            }
            for link in body.links
            if link.link.strip()
        ]

        scraped = await scrape_all_links(link_dicts)
        skipped = len(link_dicts) - len(scraped)

        count = ingest_profile(profile_id, body.cvText, qa_dicts, scraped)

        try:
            skills = await extract_skills_from_cv(body.cvText)
            if skills:

                def _save_skills() -> None:
                    firestore.client().collection('profiles').document(
                        profile_id
                    ).set({'skills': skills}, merge=True)

                await asyncio.to_thread(_save_skills)
        except Exception as exc:  # noqa: BLE001
            logger.warning('Skill extraction failed for %s: %s', profile_id, exc)

        payload: dict = {
            "status": "ok",
            "profileId": profile_id,
            "documentsIngested": count,
            "linksScraped": len(scraped),
            "linksSkipped": skipped,
        }
        skipped_reason = _skipped_reason(link_dicts, len(scraped))
        if skipped_reason:
            payload["skippedReason"] = skipped_reason

        if count == 0 and not is_vector_store_available():
            payload["ragEnabled"] = False
            payload["warning"] = (
                vector_store_unavailable_reason()
                or "Vector store unavailable; profile saved in Firestore only."
            )
        else:
            payload["ragEnabled"] = True

        return payload
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(e)) from e
