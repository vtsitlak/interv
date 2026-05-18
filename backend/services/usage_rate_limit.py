"""Per-profile usage quotas stored in Firestore (ingest cooldown, AI call counts)."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from firebase_admin import firestore

from services.api_limits import (
    INGEST_COOLDOWN_SEC,
    PERSONAL_QA_MAX_PER_HOUR,
    SUMMARIZE_MAX_PER_HOUR,
    SUGGESTED_QUESTIONS_MAX_PER_HOUR,
)

logger = logging.getLogger(__name__)

FIRESTORE_TIMEOUT_SEC = 10

_USAGE_DOC = 'usage'


def _usage_ref(profile_id: str):
    return (
        firestore.client()
        .collection('profiles')
        .document(profile_id)
        .collection('_internal')
        .document(_USAGE_DOC)
    )


def _hour_bucket() -> str:
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H')


def _sync_check_ingest(profile_id: str) -> tuple[bool, str | None]:
    ref = _usage_ref(profile_id)
    snap = ref.get()
    data = snap.to_dict() if snap.exists else {}
    last = data.get('lastIngestAt')
    if last is None:
        return True, None
    try:
        if hasattr(last, 'timestamp'):
            last_ts = last.timestamp()
        else:
            return True, None
    except Exception:  # noqa: BLE001
        return True, None

    elapsed = datetime.now(timezone.utc).timestamp() - last_ts
    if elapsed < INGEST_COOLDOWN_SEC:
        wait = int(INGEST_COOLDOWN_SEC - elapsed)
        return False, f'Please wait {wait}s before training again.'

    return True, None


def _sync_record_ingest(profile_id: str) -> None:
    _usage_ref(profile_id).set(
        {'lastIngestAt': firestore.SERVER_TIMESTAMP},
        merge=True,
    )


def _sync_check_hourly(
    profile_id: str,
    field: str,
    max_per_hour: int,
) -> tuple[bool, str | None]:
    ref = _usage_ref(profile_id)
    snap = ref.get()
    data = snap.to_dict() if snap.exists else {}
    bucket = _hour_bucket()
    stored_bucket = data.get(f'{field}Hour')
    count = int(data.get(f'{field}Count') or 0)

    if stored_bucket != bucket:
        count = 0

    if count >= max_per_hour:
        return False, 'Too many requests. Try again later.'

    ref.set(
        {
            f'{field}Hour': bucket,
            f'{field}Count': count + 1,
        },
        merge=True,
    )
    return True, None


async def check_ingest_allowed(profile_id: str) -> tuple[bool, str | None]:
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(_sync_check_ingest, profile_id),
            timeout=FIRESTORE_TIMEOUT_SEC,
        )
    except asyncio.TimeoutError:
        logger.error('Ingest rate-limit check timed out for %s', profile_id)
        return False, 'Rate limit check failed. Try again shortly.'
    except Exception as exc:  # noqa: BLE001
        logger.error('Ingest rate-limit check failed for %s: %s', profile_id, exc)
        return False, 'Rate limit check failed. Try again shortly.'


async def record_ingest(profile_id: str) -> None:
    try:
        await asyncio.wait_for(
            asyncio.to_thread(_sync_record_ingest, profile_id),
            timeout=FIRESTORE_TIMEOUT_SEC,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning('Failed to record ingest time for %s: %s', profile_id, exc)


async def check_personal_qa_allowed(profile_id: str) -> tuple[bool, str | None]:
    return await _check_hourly_quota(profile_id, 'personalQa', PERSONAL_QA_MAX_PER_HOUR)


async def check_suggested_questions_allowed(
    profile_id: str,
) -> tuple[bool, str | None]:
    return await _check_hourly_quota(
        profile_id, 'suggestedQa', SUGGESTED_QUESTIONS_MAX_PER_HOUR
    )


async def check_summarize_allowed(profile_id: str) -> tuple[bool, str | None]:
    return await _check_hourly_quota(profile_id, 'summarize', SUMMARIZE_MAX_PER_HOUR)


async def _check_hourly_quota(
    profile_id: str,
    field: str,
    max_per_hour: int,
) -> tuple[bool, str | None]:
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(_sync_check_hourly, profile_id, field, max_per_hour),
            timeout=FIRESTORE_TIMEOUT_SEC,
        )
    except asyncio.TimeoutError:
        logger.error('Hourly quota check timed out for %s/%s', profile_id, field)
        return False, 'Too many requests. Try again later.'
    except Exception as exc:  # noqa: BLE001
        logger.error(
            'Hourly quota check failed for %s/%s: %s', profile_id, field, exc
        )
        return False, 'Too many requests. Try again later.'
