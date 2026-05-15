import asyncio
from typing import Any, Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from firebase_admin import firestore

from services.gemini import stream_response
from services.rag import get_relevant_context
from services.rate_limit import check_interview_rate_limit

router = APIRouter(prefix='/chat', tags=['chat'])

# Must match ASSISTANT_STREAM_DONE_SIGNAL in libs/states/interview (Angular).
ASSISTANT_STREAM_DONE_SIGNAL = '__ASSISTANT_STREAM_DONE__'


def get_profile(profile_id: str) -> Optional[dict[str, Any]]:
    db = firestore.client()

    def _read() -> Optional[dict[str, Any]]:
        doc = db.collection('profiles').document(profile_id).get()
        if not doc.exists:
            return None
        return doc.to_dict() or {}

    return _read()


def build_system_prompt(profile: dict, context: str) -> str:
    name = profile.get('name', 'this person')
    title = profile.get('title', 'a professional')
    summary = profile.get('summary', '')

    context_block = (
        context.strip()
        if context.strip()
        else '(No matching passages were retrieved for this question; rely on the summary and stay within what you know about this person.)'
    )

    return f"""You are an AI digital twin of {name}, a {title}.

Your job is to answer questions exactly as {name} would — in first person, naturally and conversationally.

About {name}:
{summary}

Relevant context for this question (from their CV and written answers):
{context_block}

Rules:
- Always speak in first person as {name}
- Be natural, warm, and professional
- Keep answers concise — 3 to 5 sentences
- Ground substantive claims in the retrieved context when it is relevant; do not invent employers, dates, or credentials not supported by the context or summary
- If asked something not covered by the context or summary, say you would prefer to discuss it directly
- Never break character"""


@router.websocket('/{profile_id}/{interview_id}')
async def chat_ws(
    websocket: WebSocket,
    profile_id: str,
    interview_id: str,
) -> None:
    await websocket.accept()

    profile = await asyncio.to_thread(get_profile, profile_id)
    if profile is None:
        await websocket.send_text('Profile not found')
        await websocket.close()
        return

    history: list[dict[str, str]] = []

    try:
        while True:
            user_message = await websocket.receive_text()

            allowed = await check_interview_rate_limit(profile_id, interview_id)
            if not allowed:
                await websocket.send_text('INTERVIEW_COMPLETE')
                await websocket.close()
                return

            context = await asyncio.to_thread(
                get_relevant_context,
                profile_id,
                user_message,
            )
            system_prompt = build_system_prompt(profile, context)

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
