"""Save recruiter feedback and notify the candidate by email."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from firebase_admin import auth, firestore

from services.email import (
    email_configured,
    send_feedback_received_email,
    send_feedback_updated_email,
)
from services.practice_interview import is_practice_interview

logger = logging.getLogger(__name__)


def _interview_ref(profile_id: str, interview_id: str):
    db = firestore.client()
    return (
        db.collection('profiles')
        .document(profile_id)
        .collection('interviews')
        .document(interview_id)
    )


def _load_interview(profile_id: str, interview_id: str) -> dict[str, Any] | None:
    snap = _interview_ref(profile_id, interview_id).get()
    if not snap.exists:
        return None
    data = snap.to_dict() or {}
    data['id'] = snap.id
    return data


def _load_profile(profile_id: str) -> dict[str, Any]:
    snap = firestore.client().collection('profiles').document(profile_id).get()
    return snap.to_dict() if snap.exists else {}


def _candidate_email(profile_id: str) -> str | None:
    try:
        user = auth.get_user(profile_id)
    except Exception as exc:  # noqa: BLE001
        logger.warning('Could not load Auth user %s: %s', profile_id, exc)
        return None
    email = (user.email or '').strip()
    return email or None


def _save_feedback_sync(
    profile_id: str,
    interview_id: str,
    score: int,
    text: str,
    *,
    mark_email_sent: bool,
) -> None:
    payload: dict[str, Any] = {
        'feedback': {
            'score': score,
            'text': text,
            'submittedAt': firestore.SERVER_TIMESTAMP,
        },
    }
    if mark_email_sent:
        payload['feedbackEmailSentAt'] = firestore.SERVER_TIMESTAMP

    _interview_ref(profile_id, interview_id).update(payload)


def _mark_feedback_email_sent_sync(profile_id: str, interview_id: str) -> None:
    _interview_ref(profile_id, interview_id).update(
        {'feedbackEmailSentAt': firestore.SERVER_TIMESTAMP},
    )


async def _mark_feedback_email_sent(profile_id: str, interview_id: str) -> None:
    await asyncio.to_thread(
        _mark_feedback_email_sent_sync,
        profile_id,
        interview_id,
    )


async def submit_feedback_and_notify(
    profile_id: str,
    interview_id: str,
    score: int,
    text: str,
) -> dict[str, Any]:
    interview = await asyncio.to_thread(_load_interview, profile_id, interview_id)
    if interview is None:
        raise ValueError('Interview not found')

    profile = await asyncio.to_thread(_load_profile, profile_id)
    if not profile:
        raise ValueError('Profile not found')

    if is_practice_interview(interview):
        await asyncio.to_thread(
            _save_feedback_sync,
            profile_id,
            interview_id,
            score,
            text,
            mark_email_sent=False,
        )
        return {
            'status': 'ok',
            'emailSent': False,
            'reason': 'practice_session',
        }

    had_feedback = interview.get('feedback') is not None
    already_emailed = interview.get('feedbackEmailSentAt') is not None

    await asyncio.to_thread(
        _save_feedback_sync,
        profile_id,
        interview_id,
        score,
        text,
        mark_email_sent=False,
    )

    if not email_configured():
        return {'status': 'ok', 'emailSent': False, 'reason': 'email_not_configured'}

    to = _candidate_email(profile_id)
    if not to:
        return {'status': 'ok', 'emailSent': False, 'reason': 'no_candidate_email'}

    candidate_name = str(profile.get('name') or 'there').strip() or 'there'
    recruiter_name = str(interview.get('recruiterName') or 'A recruiter').strip()
    ai_summary = interview.get('aiSummary')

    try:
        if had_feedback:
            await send_feedback_updated_email(
                to=to,
                candidate_name=candidate_name,
                recruiter_name=recruiter_name,
                score=score,
                feedback_text=text,
            )
            return {'status': 'ok', 'emailSent': True, 'kind': 'updated'}

        if already_emailed:
            return {'status': 'ok', 'emailSent': False, 'reason': 'already_sent'}

        await send_feedback_received_email(
            to=to,
            candidate_name=candidate_name,
            recruiter_name=recruiter_name,
            score=score,
            feedback_text=text,
            ai_summary=str(ai_summary) if ai_summary else None,
        )
        await asyncio.to_thread(
            _mark_feedback_email_sent,
            profile_id,
            interview_id,
        )
        return {'status': 'ok', 'emailSent': True, 'kind': 'received'}
    except Exception as exc:  # noqa: BLE001
        logger.exception(
            'Feedback saved but email failed for %s/%s',
            profile_id,
            interview_id,
        )
        return {
            'status': 'ok',
            'emailSent': False,
            'reason': 'email_failed',
            'detail': str(exc),
        }
