import os

from dotenv import load_dotenv

load_dotenv()

from services.firebase_admin_init import init_firebase

init_firebase()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import chat, ingest, sessions

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
app.include_router(sessions.router)

@app.get("/health")
def health():
    return {"status": "ok"}