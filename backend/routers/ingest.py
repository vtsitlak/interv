from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.rag import ingest_profile
from services.vector_store import (
    is_vector_store_available,
    vector_store_unavailable_reason,
)

router = APIRouter(prefix="/ingest", tags=["ingest"])


class QAPair(BaseModel):
    question: str
    answer: str


class IngestRequest(BaseModel):
    cvText: str
    personalQA: List[QAPair]


@router.post("/{profile_id}")
async def ingest_profile_route(profile_id: str, body: IngestRequest):
    try:
        qa_dicts = [
            {"question": qa.question, "answer": qa.answer} for qa in body.personalQA
        ]
        count = ingest_profile(profile_id, body.cvText, qa_dicts)
        payload: dict = {
            "status": "ok",
            "profileId": profile_id,
            "documentsIngested": count,
        }
        if count == 0 and not is_vector_store_available():
            payload["ragEnabled"] = False
            payload["warning"] = (
                vector_store_unavailable_reason()
                or "Vector store unavailable; profile saved in Firestore only."
            )
        else:
            payload["ragEnabled"] = True
        return payload
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(e)) from e
