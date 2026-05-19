"""Public profile helpers."""

from __future__ import annotations

import asyncio
import logging
from typing import Annotated, Any, Optional

from fastapi import APIRouter, Header, HTTPException, Query
from firebase_admin import firestore

from services.api_limits import MAX_SUMMARY_QUERY_CHARS, MAX_TITLE_QUERY_CHARS
from services.auth import verify_profile_owner_token
from services.personal_qa_questions import generate_personal_qa_questions
from services.request_validation import validate_query_title_summary
from services.skills import extract_skills_from_cv
from services.suggested_questions import generate_suggested_questions
from services.usage_rate_limit import (
    check_personal_qa_allowed,
    check_suggested_questions_allowed,
)

router = APIRouter(prefix='/profiles', tags=['profiles'])
logger = logging.getLogger(__name__)


def _load_profile(profile_id: str) -> Optional[dict[str, Any]]:
    snap = firestore.client().collection('profiles').document(profile_id).get()
    if not snap.exists:
        return None
    return snap.to_dict() or {}


@router.get('/{profile_id}/suggested-questions')
async def suggested_questions(profile_id: str):
    try:
        allowed, reason = await check_suggested_questions_allowed(profile_id)
        if not allowed:
            raise HTTPException(status_code=429, detail=reason or 'Rate limit exceeded')

        profile = await asyncio.to_thread(_load_profile, profile_id)
        if profile is None:
            raise HTTPException(status_code=404, detail='Profile not found')
        questions = await generate_suggested_questions(profile)
        return {'questions': questions}
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.exception('Suggested questions failed for %s', profile_id)
        raise HTTPException(status_code=500, detail='Failed to generate questions') from exc


@router.get('/{profile_id}/personal-qa-questions')
async def personal_qa_questions(
    profile_id: str,
    title: str | None = Query(default=None, max_length=MAX_TITLE_QUERY_CHARS),
    summary: str | None = Query(default=None, max_length=MAX_SUMMARY_QUERY_CHARS),
    authorization: Annotated[str | None, Header()] = None,
):
    verify_profile_owner_token(profile_id, authorization)

    allowed, reason = await check_personal_qa_allowed(profile_id)
    if not allowed:
        raise HTTPException(status_code=429, detail=reason or 'Rate limit exceeded')

    try:
        profile = await asyncio.to_thread(_load_profile, profile_id)
        if profile is None:
            raise HTTPException(status_code=404, detail='Profile not found')

        title_clean, summary_clean = validate_query_title_summary(title, summary)
        if title_clean:
            profile = {**profile, 'title': title_clean}
        if summary_clean:
            profile = {**profile, 'summary': summary_clean}

        questions = await generate_personal_qa_questions(profile)
        return {'questions': questions}
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.exception('Personal Q&A questions failed for %s', profile_id)
        raise HTTPException(
            status_code=500, detail='Failed to generate questions'
        ) from exc


@router.post('/{profile_id}/extract-skills')
async def extract_skills(
    profile_id: str,
    authorization: Annotated[str | None, Header()] = None,
):
    """Extract skills from CV and save on the profile document."""
    verify_profile_owner_token(profile_id, authorization)

    try:
        profile = await asyncio.to_thread(_load_profile, profile_id)
        if profile is None:
            raise HTTPException(status_code=404, detail='Profile not found')

        cv_text = profile.get('cvText') or ''
        title = profile.get('title') or ''
        skills = await extract_skills_from_cv(cv_text, title)

        def _save() -> None:
            firestore.client().collection('profiles').document(profile_id).update(
                {'skills': skills}
            )

        await asyncio.to_thread(_save)
        return {'status': 'ok', 'skills': skills}
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.exception('Extract skills failed for %s', profile_id)
        raise HTTPException(status_code=500, detail='Skill extraction failed') from exc
