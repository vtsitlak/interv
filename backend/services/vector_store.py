"""ChromaDB persistent vector store (one collection per profile)."""

import os

from services.sqlite_patch import patch_sqlite

patch_sqlite()

import chromadb
from chromadb.config import Settings

_persist_path = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")

chroma_client = chromadb.PersistentClient(
    path=_persist_path,
    settings=Settings(anonymized_telemetry=False),
)


def get_or_create_collection(profile_id: str):
    return chroma_client.get_or_create_collection(
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
    collection = get_or_create_collection(profile_id)
    results = collection.query(
        query_texts=[query],
        n_results=n_results,
    )
    docs = results.get("documents") or []
    return docs[0] if docs else []


def delete_collection(profile_id: str) -> None:
    name = f"profile_{profile_id}"
    try:
        chroma_client.delete_collection(name)
    except Exception:
        pass
