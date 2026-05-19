"""Account reset and deletion (authenticated profile owner)."""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Header, HTTPException
from firebase_admin import auth, firestore

from services.account_cleanup import (
    delete_candidate_account,
    delete_recruiter_account,
    delete_user_document,
    reset_candidate_profile,
)
from services.auth import verify_bearer_token

router = APIRouter(prefix='/accounts', tags=['accounts'])
logger = logging.getLogger(__name__)


def _user_role(uid: str) -> str:
    snap = firestore.client().collection('users').document(uid).get()
    if not snap.exists:
        return 'candidate'
    role = (snap.to_dict() or {}).get('role')
    return 'recruiter' if role == 'recruiter' else 'candidate'


@router.post('/reset-profile')
async def reset_profile(
    authorization: Annotated[str | None, Header()] = None,
):
    uid = verify_bearer_token(authorization)
    if _user_role(uid) != 'candidate':
        raise HTTPException(
            status_code=403,
            detail='Only candidate accounts can reset their profile.',
        )

    try:
        reset_candidate_profile(uid)
        return {'status': 'ok'}
    except Exception as exc:  # noqa: BLE001
        logger.exception('Profile reset failed for %s', uid)
        raise HTTPException(status_code=500, detail='Profile reset failed') from exc


@router.delete('/me')
async def delete_me(
    authorization: Annotated[str | None, Header()] = None,
):
    uid = verify_bearer_token(authorization)
    role = _user_role(uid)

    try:
        if role == 'recruiter':
            delete_recruiter_account(uid)
        else:
            delete_candidate_account(uid)
        delete_user_document(uid)
        auth.delete_user(uid)
        return {'status': 'ok'}
    except Exception as exc:  # noqa: BLE001
        logger.exception('Account deletion failed for %s', uid)
        raise HTTPException(status_code=500, detail='Account deletion failed') from exc
