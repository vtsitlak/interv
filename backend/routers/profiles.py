"""Public profile helpers."""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query
from firebase_admin import firestore

from services.skills import extract_skills_from_cv
from services.personal_qa_questions import generate_personal_qa_questions
from services.suggested_questions import generate_suggested_questions

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
        profile = await asyncio.to_thread(_load_profile, profile_id)
        if profile is None:
            raise HTTPException(status_code=404, detail='Profile not found')
        questions = await generate_suggested_questions(profile)
        return {'questions': questions}
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.exception('Suggested questions failed for %s', profile_id)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get('/{profile_id}/personal-qa-questions')
async def personal_qa_questions(
    profile_id: str,
    title: str | None = Query(default=None),
    summary: str | None = Query(default=None),
):
    try:
        profile = await asyncio.to_thread(_load_profile, profile_id)
        if profile is None:
            raise HTTPException(status_code=404, detail='Profile not found')
        if title is not None and title.strip():
            profile = {**profile, 'title': title.strip()}
        if summary is not None and summary.strip():
            profile = {**profile, 'summary': summary.strip()[:800]}
        questions = await generate_personal_qa_questions(profile)
        return {'questions': questions}
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.exception('Personal Q&A questions failed for %s', profile_id)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post('/{profile_id}/extract-skills')
async def extract_skills(profile_id: str):
    """Extract skills from CV and save on the profile document."""
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
        raise HTTPException(status_code=500, detail=str(exc)) from exc
