"""Interview post-processing: AI summary."""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from firebase_admin import firestore

from services.interview_summary import generate_interview_summary

router = APIRouter(prefix='/interviews', tags=['interviews'])
logger = logging.getLogger(__name__)


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


@router.post('/{profile_id}/{interview_id}/summarize')
async def summarize_interview(profile_id: str, interview_id: str):
    """Generate and store a 3–5 sentence AI summary (one Gemini call)."""
    try:
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
