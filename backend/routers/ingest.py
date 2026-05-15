from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.rag import ingest_profile

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
        return {
            "status": "ok",
            "profileId": profile_id,
            "documentsIngested": count,
        }
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(e)) from e
