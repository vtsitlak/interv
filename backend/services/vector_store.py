"""ChromaDB persistent vector store (one collection per profile)."""

import logging
import os
from typing import Optional

from services.sqlite_patch import patch_sqlite

patch_sqlite()

logger = logging.getLogger(__name__)

_persist_path = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
_chroma_client = None
_chroma_init_error: Optional[str] = None


def is_vector_store_available() -> bool:
    return _get_client() is not None


def vector_store_unavailable_reason() -> Optional[str]:
    if _chroma_client is not None:
        return None
    return _chroma_init_error


def _get_client():
    global _chroma_client, _chroma_init_error
    if _chroma_client is not None:
        return _chroma_client
    if _chroma_init_error is not None:
        return None

    try:
        import chromadb
        from chromadb.config import Settings

        _chroma_client = chromadb.PersistentClient(
            path=_persist_path,
            settings=Settings(anonymized_telemetry=False),
        )
        return _chroma_client
    except Exception as exc:  # noqa: BLE001
        _chroma_init_error = str(exc)
        logger.warning("ChromaDB unavailable; RAG disabled: %s", exc)
        return None


def get_or_create_collection(profile_id: str):
    client = _get_client()
    if client is None:
        raise RuntimeError(
            _chroma_init_error or "ChromaDB is not available on this server"
        )
    return client.get_or_create_collection(
        name=f"profile_{profile_id}",
        metadata={"hnsw:space": "cosine"},
    )


def upsert_documents(profile_id: str, documents: list[dict]) -> None:
    collection = get_or_create_collection(profile_id)
    collection.upsert(
        ids=[d["id"] for d in documents],
        documents=[d["text"] for d in documents],
        metadatas=[d["metadata"] for d in documents],
    )


def query_documents(profile_id: str, query: str, n_results: int = 5) -> list[str]:
    client = _get_client()
    if client is None:
        return []
    collection = client.get_or_create_collection(
        name=f"profile_{profile_id}",
        metadata={"hnsw:space": "cosine"},
    )
    results = collection.query(
        query_texts=[query],
        n_results=n_results,
    )
    docs = results.get("documents") or []
    return docs[0] if docs else []


def delete_collection(profile_id: str) -> None:
    client = _get_client()
    if client is None:
        return
    name = f"profile_{profile_id}"
    try:
        client.delete_collection(name)
    except Exception:
        pass
