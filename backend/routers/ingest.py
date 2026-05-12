from typing import List

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/ingest", tags=["ingest"])


class QAPair(BaseModel):
    question: str
    answer: str


class IngestRequest(BaseModel):
    cvText: str
    personalQA: List[QAPair]


@router.post("/{profile_id}")
async def ingest_profile(profile_id: str, body: IngestRequest):
    # RAG pipeline comes later — for now just confirm receipt
    return {"status": "ok", "profileId": profile_id, "received": True}
