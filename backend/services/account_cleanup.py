"""Delete or reset account-related Firestore data (Admin SDK)."""

from __future__ import annotations

import logging
from typing import Any

from firebase_admin import firestore

from services.vector_store import delete_collection

logger = logging.getLogger(__name__)

_EMPTY_CANDIDATE_PROFILE: dict[str, Any] = {
    'name': '',
    'title': '',
    'photo': '',
    'summary': '',
    'cvText': '',
    'linkedIn': '',
    'workPreferences': [],
    'links': [],
    'personalQA': [],
    'skills': [],
    'isPublished': True,
    'isPublicProfileEnabled': True,
}


def _db():
    return firestore.client()


def _delete_collection(ref, batch_size: int = 400) -> None:
    while True:
        docs = list(ref.limit(batch_size).stream())
        if not docs:
            break
        batch = _db().batch()
        for doc in docs:
            batch.delete(doc.reference)
        batch.commit()


def _delete_candidate_interviews(profile_id: str) -> None:
    interviews = _db().collection('profiles').document(profile_id).collection(
        'interviews'
    )
    for snap in interviews.stream():
        data = snap.to_dict() or {}
        recruiter_uid = data.get('recruiterUid')
        if recruiter_uid:
            _db().collection('recruiters').document(str(recruiter_uid)).collection(
                'interviews'
            ).document(snap.id).delete()
        snap.reference.delete()


def reset_candidate_profile(profile_id: str) -> None:
    """Remove interviews and RAG data; clear profile fields."""
    _delete_candidate_interviews(profile_id)
    delete_collection(profile_id)

    profile_ref = _db().collection('profiles').document(profile_id)
    if profile_ref.get().exists:
        profile_ref.set(
            {
                **_EMPTY_CANDIDATE_PROFILE,
                'id': profile_id,
                'userId': profile_id,
                'shareUrl': f'/candidate/{profile_id}',
            },
            merge=True,
        )
    logger.info('Reset candidate profile %s', profile_id)


def delete_candidate_account(profile_id: str) -> None:
    """Remove candidate profile, interviews, and RAG data."""
    _delete_candidate_interviews(profile_id)
    delete_collection(profile_id)
    _delete_collection(
        _db().collection('profiles').document(profile_id).collection('interviews')
    )
    _db().collection('profiles').document(profile_id).delete()
    logger.info('Deleted candidate profile data for %s', profile_id)


def delete_recruiter_account(recruiter_id: str) -> None:
    """Remove recruiter profile and conducted interviews."""
    recruiter_ref = _db().collection('recruiters').document(recruiter_id)
    _delete_collection(recruiter_ref.collection('interviews'))
    recruiter_ref.delete()
    logger.info('Deleted recruiter data for %s', recruiter_id)


def delete_user_document(user_id: str) -> None:
    _db().collection('users').document(user_id).delete()
