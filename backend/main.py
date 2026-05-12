from dotenv import load_dotenv

load_dotenv()

from services.firebase_admin_init import init_firebase

init_firebase()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import chat, ingest, sessions

app = FastAPI(title="Intervai API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",
        "http://127.0.0.1:4200",
        "https://intervai.vercel.app",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(ingest.router)
app.include_router(sessions.router)

@app.get("/health")
def health():
    return {"status": "ok"}