"""Chunk, ingest, and retrieve profile context for RAG."""

import logging
import os
from typing import Any

from services.vector_store import (
    delete_collection,
    is_vector_store_available,
    query_documents,
    upsert_documents,
    vector_store_unavailable_reason,
)

logger = logging.getLogger(__name__)


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """Split text into overlapping word windows for retrieval."""
    words = text.split()
    if not words:
        return []

    chunks: list[str] = []
    i = 0
    step = max(chunk_size - overlap, 1)
    while i < len(words):
        chunk = " ".join(words[i : i + chunk_size])
        chunks.append(chunk)
        i += step
    return chunks


def ingest_profile(
    profile_id: str,
    cv_text: str,
    personal_qa: list[dict[str, Any]],
    scraped_links: list[dict[str, Any]] | None = None,
) -> int:
    """Replace Chroma collection for this profile with CV, Q&A, and link chunks."""
    if not is_vector_store_available():
        reason = vector_store_unavailable_reason() or "unknown"
        logger.warning("Skipping RAG ingest for %s: %s", profile_id, reason)
        return 0

    delete_collection(profile_id)

    link_items = scraped_links or []
    documents: list[dict] = []
    cv_chunks = chunk_text(cv_text)
    for i, chunk in enumerate(cv_chunks):
        documents.append(
            {
                "id": f"{profile_id}_cv_{i}",
                "text": chunk,
                "metadata": {"type": "cv", "profile_id": str(profile_id)},
            }
        )

    for i, qa in enumerate(personal_qa):
        answer = (qa.get("answer") or "").strip()
        if not answer:
            continue
        question = (qa.get("question") or "").strip()
        qa_text = f"Question: {question}\nAnswer: {answer}"
        documents.append(
            {
                "id": f"{profile_id}_qa_{i}",
                "text": qa_text,
                "metadata": {"type": "qa", "profile_id": str(profile_id)},
            }
        )

    for i, link in enumerate(link_items):
        description = str(
            link.get("description") or link.get("label") or link.get("link") or "link"
        ).strip()
        href = str(link.get("link") or link.get("url") or "")
        scraped = str(link.get("text") or "").strip()
        link_body_parts: list[str] = []
        if description:
            link_body_parts.append(f"Candidate note about this link: {description}")
        if scraped:
            link_body_parts.append(scraped)
        link_text = "\n\n".join(link_body_parts)
        if not link_text.strip():
            continue
        for j, chunk in enumerate(chunk_text(link_text)):
            documents.append(
                {
                    "id": f"{profile_id}_link_{i}_{j}",
                    "text": f"From {description} ({href}):\n{chunk}",
                    "metadata": {
                        "type": "link",
                        "description": description,
                        "link": href,
                        "profile_id": str(profile_id),
                    },
                }
            )

    if documents:
        upsert_documents(profile_id, documents)
    return len(documents)


def get_relevant_context(profile_id: str, query: str, n_results: int = 5) -> str:
    """Retrieve the most relevant chunks for a recruiter question."""
    if os.getenv("SKIP_RAG", "").strip().lower() in ("1", "true", "yes"):
        return ""
    if not is_vector_store_available():
        return ""
    results = query_documents(profile_id, query, n_results=n_results)
    if not results:
        return ""
    return "\n\n---\n\n".join(results)
