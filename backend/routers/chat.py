import asyncio
import logging
from typing import Any, Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from firebase_admin import firestore

from services.gemini import stream_response
from services.rag import get_relevant_context
from services.rate_limit import check_interview_rate_limit

router = APIRouter(prefix='/chat', tags=['chat'])
logger = logging.getLogger(__name__)

# Must match ASSISTANT_STREAM_DONE_SIGNAL in libs/states/interview (Angular).
ASSISTANT_STREAM_DONE_SIGNAL = '__ASSISTANT_STREAM_DONE__'

RAG_TIMEOUT_SEC = 15
GEMINI_TIMEOUT_SEC = 90


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


async def _retrieve_context(profile_id: str, user_message: str) -> str:
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(get_relevant_context, profile_id, user_message),
            timeout=RAG_TIMEOUT_SEC,
        )
    except asyncio.TimeoutError:
        logger.warning('RAG retrieval timed out for profile %s', profile_id)
        return ''
    except Exception as exc:  # noqa: BLE001
        logger.warning('RAG retrieval failed for profile %s: %s', profile_id, exc)
        return ''


async def _stream_gemini_to_client(
    websocket: WebSocket,
    system_prompt: str,
    history: list[dict[str, str]],
    user_message: str,
) -> str:
    full_response = ''

    async def _consume() -> None:
        nonlocal full_response
        async for chunk in stream_response(system_prompt, history, user_message):
            if chunk:
                await websocket.send_text(chunk)
                full_response += chunk

    try:
        await asyncio.wait_for(_consume(), timeout=GEMINI_TIMEOUT_SEC)
    except asyncio.TimeoutError:
        msg = 'Error: The assistant took too long to respond. Please try again.'
        await websocket.send_text(msg)
        full_response = msg
    except Exception as exc:  # noqa: BLE001
        msg = f'Error generating response: {exc}'
        logger.exception('Gemini stream failed')
        await websocket.send_text(msg)
        full_response = msg

    return full_response


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

            try:
                context = await _retrieve_context(profile_id, user_message)
                system_prompt = build_system_prompt(profile, context)

                history.append({'role': 'user', 'content': user_message})

                full_response = await _stream_gemini_to_client(
                    websocket,
                    system_prompt,
                    history[:-1],
                    user_message,
                )

                history.append({'role': 'assistant', 'content': full_response})
            except Exception as exc:  # noqa: BLE001
                logger.exception('Chat turn failed for %s/%s', profile_id, interview_id)
                err = f'Error: {exc}'
                try:
                    await websocket.send_text(err)
                except Exception:  # noqa: BLE001
                    break
            finally:
                try:
                    await websocket.send_text(ASSISTANT_STREAM_DONE_SIGNAL)
                except Exception:  # noqa: BLE001
                    break

    except WebSocketDisconnect:
        pass
