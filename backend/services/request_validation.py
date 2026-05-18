"""Validate and trim ingest / profile payloads before Gemini calls."""

from __future__ import annotations

from fastapi import HTTPException

from services.api_limits import (
    MAX_CHAT_MESSAGE_CHARS,
    MAX_CV_CHARS,
    MAX_LINK_DESC_CHARS,
    MAX_LINK_URL_CHARS,
    MAX_LINKS,
    MAX_QA_ANSWER_CHARS,
    MAX_QA_PAIRS,
    MAX_QA_QUESTION_CHARS,
    MAX_SUMMARY_QUERY_CHARS,
    MAX_TITLE_QUERY_CHARS,
)


def clamp_text(value: str, max_len: int) -> str:
    return (value or '')[:max_len]


def validate_query_title_summary(title: str | None, summary: str | None) -> tuple[str, str]:
    t = clamp_text((title or '').strip(), MAX_TITLE_QUERY_CHARS)
    s = clamp_text((summary or '').strip(), MAX_SUMMARY_QUERY_CHARS)
    return t, s


def validate_ingest_payload(
    cv_text: str,
    personal_qa: list[dict],
    links: list[dict],
) -> tuple[str, list[dict], list[dict]]:
    cv = (cv_text or '').strip()
    if not cv:
        raise HTTPException(status_code=400, detail='CV text is required')
    if len(cv) > MAX_CV_CHARS:
        raise HTTPException(
            status_code=400,
            detail=f'CV text exceeds {MAX_CV_CHARS} characters',
        )

    if len(personal_qa) > MAX_QA_PAIRS:
        raise HTTPException(
            status_code=400,
            detail=f'Maximum {MAX_QA_PAIRS} Q&A pairs allowed',
        )

    qa_out: list[dict] = []
    for qa in personal_qa:
        question = clamp_text(str(qa.get('question') or ''), MAX_QA_QUESTION_CHARS)
        answer = clamp_text(str(qa.get('answer') or ''), MAX_QA_ANSWER_CHARS)
        if question or answer:
            qa_out.append({'question': question, 'answer': answer})

    if len(links) > MAX_LINKS:
        raise HTTPException(
            status_code=400,
            detail=f'Maximum {MAX_LINKS} links allowed',
        )

    link_out: list[dict] = []
    for link in links:
        href = clamp_text(str(link.get('link') or ''), MAX_LINK_URL_CHARS)
        if not href:
            continue
        link_out.append(
            {
                'description': clamp_text(
                    str(link.get('description') or ''), MAX_LINK_DESC_CHARS
                ),
                'link': href,
            }
        )

    return cv, qa_out, link_out


def validate_chat_message(message: str) -> str:
    text = (message or '').strip()
    if not text:
        raise ValueError('Empty message')

    if len(text) > MAX_CHAT_MESSAGE_CHARS:
        return text[:MAX_CHAT_MESSAGE_CHARS]
    return text
