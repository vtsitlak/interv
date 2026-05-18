"""Firebase ID token verification for profile-owner routes."""

from __future__ import annotations

import logging
import os
from typing import Annotated

from fastapi import Header, HTTPException
from firebase_admin import auth

logger = logging.getLogger(__name__)


def firebase_auth_disabled() -> bool:
    return os.getenv('DISABLE_FIREBASE_AUTH', '').strip().lower() in (
        '1',
        'true',
        'yes',
    )


def verify_profile_owner_token(profile_id: str, authorization: str | None) -> str:
    """
    Verify Bearer Firebase ID token and ensure uid matches profile_id.
    Returns the authenticated uid.
    """
    if firebase_auth_disabled():
        logger.warning(
            'DISABLE_FIREBASE_AUTH is set — skipping token check for profile %s',
            profile_id,
        )
        return profile_id

    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Authorization required')

    token = authorization.removeprefix('Bearer ').strip()
    if not token:
        raise HTTPException(status_code=401, detail='Authorization required')

    try:
        decoded = auth.verify_id_token(token)
    except Exception as exc:  # noqa: BLE001
        logger.info('Invalid Firebase token for profile %s: %s', profile_id, exc)
        raise HTTPException(status_code=401, detail='Invalid or expired token') from exc

    uid = str(decoded.get('uid') or '')
    if uid != profile_id:
        raise HTTPException(status_code=403, detail='Not allowed for this profile')

    return uid


def profile_owner_header(
    profile_id: str,
    authorization: Annotated[str | None, Header()] = None,
) -> str:
    """FastAPI dependency: require authenticated profile owner."""
    return verify_profile_owner_token(profile_id, authorization)
