"""Interview post-processing: AI summary and recruiter feedback."""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from firebase_admin import firestore
from pydantic import BaseModel, Field

from services.api_limits import MAX_FEEDBACK_TEXT_CHARS
from services.feedback_notify import submit_feedback_and_notify
from services.interview_summary import generate_interview_summary
from services.usage_rate_limit import check_feedback_allowed, check_summarize_allowed

router = APIRouter(prefix='/interviews', tags=['interviews'])
logger = logging.getLogger(__name__)


class FeedbackRequest(BaseModel):
    score: int = Field(ge=1, le=10)
    text: str = Field(min_length=1, max_length=MAX_FEEDBACK_TEXT_CHARS)


def _interview_ref(profile_id: str, interview_id: str):
    db = firestore.client()
    return (
        db.collection('profiles')
        .document(profile_id)
        .collection('interviews')
        .document(interview_id)
    )


def _load_interview(profile_id: str, interview_id: str) -> Optional[dict[str, Any]]:
    snap = _interview_ref(profile_id, interview_id).get()
    if not snap.exists:
        return None
    data = snap.to_dict() or {}
    data['id'] = snap.id
    return data


def _load_profile(profile_id: str) -> Optional[dict[str, Any]]:
    snap = firestore.client().collection('profiles').document(profile_id).get()
    if not snap.exists:
        return None
    return snap.to_dict() or {}


@router.post('/{profile_id}/{interview_id}/feedback')
async def submit_interview_feedback(
    profile_id: str,
    interview_id: str,
    body: FeedbackRequest,
):
    """Save recruiter feedback and email the candidate (skipped for practice sessions)."""
    try:
        allowed, reason = await check_feedback_allowed(profile_id)
        if not allowed:
            raise HTTPException(status_code=429, detail=reason or 'Rate limit exceeded')

        text = body.text.strip()
        if not text:
            raise HTTPException(status_code=400, detail='Feedback text is required')

        result = await submit_feedback_and_notify(
            profile_id,
            interview_id,
            body.score,
            text,
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.exception('Feedback failed for %s/%s', profile_id, interview_id)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post('/{profile_id}/{interview_id}/summarize')
async def summarize_interview(profile_id: str, interview_id: str):
    """Generate and store a 3–5 sentence AI summary (one Gemini call)."""
    try:
        allowed, reason = await check_summarize_allowed(profile_id)
        if not allowed:
            raise HTTPException(status_code=429, detail=reason or 'Rate limit exceeded')

        interview = await asyncio.to_thread(_load_interview, profile_id, interview_id)
        if interview is None:
            raise HTTPException(status_code=404, detail='Interview not found')

        profile = await asyncio.to_thread(_load_profile, profile_id) or {}
        candidate_name = profile.get('name') or 'the candidate'
        recruiter_name = interview.get('recruiterName') or 'A recruiter'
        messages = interview.get('messages') or []

        summary = await generate_interview_summary(
            candidate_name=candidate_name,
            recruiter_name=recruiter_name,
            messages=messages,
        )

        def _save() -> None:
            _interview_ref(profile_id, interview_id).update({'aiSummary': summary})

        await asyncio.to_thread(_save)
        return {'status': 'ok', 'aiSummary': summary}
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.exception('Summarize failed for %s/%s', profile_id, interview_id)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
