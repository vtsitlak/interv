import asyncio

from firebase_admin import firestore
from google.cloud.firestore import Increment


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

    return await asyncio.to_thread(_sync)
