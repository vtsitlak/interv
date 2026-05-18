import logging
import os
from typing import Optional

from dotenv import load_dotenv

logger = logging.getLogger(__name__)
from google import genai
from google.genai import types

load_dotenv()

# Chat (streaming interview twin) — default flash for low latency.
_CHAT_MODEL = (
    os.getenv('GEMINI_CHAT_MODEL')
    or os.getenv('GEMINI_MODEL')
    or 'gemini-3-flash-preview'
)

# Profile extract / train (skills, Q&A prompts, etc.) — default pro for quality.
_PROFILE_MODEL = os.getenv('GEMINI_PROFILE_MODEL') or 'gemini-3.1-pro-preview'


def chat_model() -> str:
    return _CHAT_MODEL


def profile_model() -> str:
    return _PROFILE_MODEL


def _client() -> Optional[genai.Client]:
    key = os.getenv('GEMINI_API_KEY')
    if not key:
        return None
    return genai.Client(api_key=key)


def _to_gemini_role(role: str) -> str:
    return 'model' if role == 'assistant' else 'user'


async def _generate_content(
    model: str,
    prompt: str,
    *,
    system_instruction: str = '',
    max_output_tokens: int = 1024,
) -> str:
    client = _client()
    if client is None:
        return ''

    config_kwargs: dict = {'max_output_tokens': max_output_tokens}
    if system_instruction.strip():
        config_kwargs['system_instruction'] = system_instruction.strip()

    try:
        response = await client.aio.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(**config_kwargs),
        )
        text = getattr(response, 'text', None) or ''
        return text.strip()
    except Exception as exc:  # noqa: BLE001
        logger.warning('Gemini generate failed for model %s: %s', model, exc)
        return ''


async def generate_text(
    prompt: str,
    *,
    system_instruction: str = '',
    max_output_tokens: int = 1024,
    model: str | None = None,
) -> str:
    """Non-streaming completion (defaults to the profile / training model)."""
    return await _generate_content(
        model or _PROFILE_MODEL,
        prompt,
        system_instruction=system_instruction,
        max_output_tokens=max_output_tokens,
    )


async def generate_chat_text(
    prompt: str,
    *,
    system_instruction: str = '',
    max_output_tokens: int = 1024,
) -> str:
    """Non-streaming completion using the chat model (e.g. interview summaries)."""
    return await _generate_content(
        _CHAT_MODEL,
        prompt,
        system_instruction=system_instruction,
        max_output_tokens=max_output_tokens,
    )


async def stream_response(
    system_prompt: str,
    history: list[dict[str, str]],
    user_message: str,
):
    client = _client()
    if client is None:
        yield 'Error: GEMINI_API_KEY is not configured.'
        return

    contents: list[types.Content] = []
    for m in history:
        contents.append(
            types.Content(
                role=_to_gemini_role(m['role']),
                parts=[types.Part(text=m['content'])],
            )
        )
    contents.append(
        types.Content(
            role='user',
            parts=[types.Part(text=user_message)],
        )
    )

    try:
        stream = await client.aio.models.generate_content_stream(
            model=_CHAT_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(system_instruction=system_prompt),
        )
        async for chunk in stream:
            text = getattr(chunk, 'text', None) or ''
            if text:
                yield text
    except Exception as exc:  # noqa: BLE001
        logger.warning('Gemini stream failed for model %s: %s', _CHAT_MODEL, exc)
        yield 'Error generating response. Please try again.'
