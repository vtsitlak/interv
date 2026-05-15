import os
from typing import Optional

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

_MODEL = os.getenv('GEMINI_MODEL', 'gemini-2.0-flash')


def _client() -> Optional[genai.Client]:
    key = os.getenv('GEMINI_API_KEY')
    if not key:
        return None
    return genai.Client(api_key=key)


def _to_gemini_role(role: str) -> str:
    return 'model' if role == 'assistant' else 'user'


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
            model=_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(system_instruction=system_prompt),
        )
        async for chunk in stream:
            text = getattr(chunk, 'text', None) or ''
            if text:
                yield text
    except Exception as exc:  # noqa: BLE001
        yield f'Error generating response: {exc}'
