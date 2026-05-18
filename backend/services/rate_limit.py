import asyncio
import logging

from firebase_admin import firestore
from google.cloud.firestore import Increment

logger = logging.getLogger(__name__)

FIRESTORE_TIMEOUT_SEC = 10


async def check_interview_rate_limit(profile_id: str, interview_id: str) -> bool:
    """Returns True if another recruiter message is allowed; increments counter."""

    def _sync() -> bool:
        db = firestore.client()
        ref = (
            db.collection('profiles')
            .document(profile_id)
            .collection('interviews')
            .document(interview_id)
        )
        snap = ref.get()
        if not snap.exists:
            return False
        data = snap.to_dict() or {}
        count = int(data.get('recruiterMessageCount', 0))
        max_msgs = int(data.get('maxMessages', 8))
        if count >= max_msgs:
            return False
        ref.update({'recruiterMessageCount': Increment(1)})
        return True

    try:
        return await asyncio.wait_for(
            asyncio.to_thread(_sync),
            timeout=FIRESTORE_TIMEOUT_SEC,
        )
    except asyncio.TimeoutError:
        logger.error(
            'Firestore rate-limit timed out for %s/%s; denying message',
            profile_id,
            interview_id,
        )
        return False
