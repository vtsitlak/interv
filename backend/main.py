import os

from dotenv import load_dotenv

load_dotenv()

from services.sqlite_patch import patch_sqlite

patch_sqlite()

from services.firebase_admin_init import init_firebase

init_firebase()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import chat, ingest, interviews, profiles, sessions

_DEFAULT_ORIGINS = [
    "http://localhost:4200",
    "http://127.0.0.1:4200",
    "https://intervai.vercel.app",
    "https://getinterv.web.app",
    "https://getinterv.firebaseapp.com",
]

_extra = os.getenv("BACKEND_CORS_ORIGINS", "").strip()
_extra_origins = [o.strip() for o in _extra.split(",") if o.strip()]

app = FastAPI(title="Intervai API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_DEFAULT_ORIGINS + _extra_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(ingest.router)
app.include_router(interviews.router)
app.include_router(profiles.router)
app.include_router(sessions.router)

@app.get("/health")
def health():
    import os

    from services.vector_store import (
        is_vector_store_available,
        vector_store_unavailable_reason,
    )

    return {
        "status": "ok",
        "geminiConfigured": bool(os.getenv("GEMINI_API_KEY")),
        "chromaPersistDir": os.getenv("CHROMA_PERSIST_DIR", "./chroma_db"),
        "chromaAvailable": is_vector_store_available(),
        "chromaError": vector_store_unavailable_reason(),
        "skipRag": os.getenv("SKIP_RAG", "").strip().lower() in ("1", "true", "yes"),
    }