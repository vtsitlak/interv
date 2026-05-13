import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from firebase_admin import firestore
from google.cloud.firestore import Increment

from services.gemini import stream_response
from services.rate_limit import check_interview_rate_limit

router = APIRouter(prefix='/chat', tags=['chat'])

# Must match ASSISTANT_STREAM_DONE_SIGNAL in libs/states/interview (Angular).
ASSISTANT_STREAM_DONE_SIGNAL = '__ASSISTANT_STREAM_DONE__'


def get_profile(profile_id: str) -> dict:
    db = firestore.client()
    doc = db.collection('profiles').document(profile_id).get()
    return doc.to_dict() if doc.exists else {}


def build_system_prompt(profile: dict) -> str:
    name = profile.get('name', 'this person')
    title = profile.get('title', 'a professional')
    summary = profile.get('summary', '')
    cv = profile.get('cvText', '')
    qa_pairs = profile.get('personalQA', []) or []

    qa_text = '\n'.join(
        [
            f"Q: {qa.get('question', '')}\nA: {qa.get('answer', '')}"
            for qa in qa_pairs
            if qa.get('answer')
        ]
    )

    return f"""You are an AI digital twin of {name}, a {title}.

Your job is to answer questions exactly as {name} would — in first person, naturally and conversationally.

Here is their background:
{summary}

Their CV:
{cv}

Their personal answers:
{qa_text}

Rules:
- Always speak in first person as {name}
- Be natural, warm, and professional
- Keep answers concise — 3 to 5 sentences max
- Never make up information not in the profile
- If asked something not in the profile, say you'd prefer to discuss it directly
- After the recruiter has asked 8 questions, end with a friendly closing message"""


@router.websocket('/{profile_id}/{interview_id}')
async def chat_ws(
    websocket: WebSocket,
    profile_id: str,
    interview_id: str,
) -> None:
    await websocket.accept()

    profile = get_profile(profile_id)
    if not profile:
        await websocket.send_text('Profile not found')
        await websocket.close()
        return

    system_prompt = build_system_prompt(profile)
    history: list[dict[str, str]] = []

    try:
        while True:
            user_message = await websocket.receive_text()

            allowed = await check_interview_rate_limit(profile_id, interview_id)
            if not allowed:
                await websocket.send_text('INTERVIEW_COMPLETE')
                await websocket.close()
                return

            history.append({'role': 'user', 'content': user_message})

            full_response = ''
            try:
                async for chunk in stream_response(
                    system_prompt,
                    history[:-1],
                    user_message,
                ):
                    await websocket.send_text(chunk)
                    full_response += chunk
            except Exception as exc:  # noqa: BLE001
                err = f'Error generating response: {exc}'
                await websocket.send_text(err)
                full_response = err

            history.append({'role': 'assistant', 'content': full_response})
            await websocket.send_text(ASSISTANT_STREAM_DONE_SIGNAL)

    except WebSocketDisconnect:
        pass
