"""Personal Q&A prompts for the profile editor — role/summary-specific (general prompts are fixed client-side)."""

from __future__ import annotations

import re
from typing import Any

from services.gemini import generate_text

_META_PREFIX = re.compile(r'^ask\s+(about|how)\b', re.IGNORECASE)
_TRUNCATED_ROLE = re.compile(r'as a ([^?,]{1,3})\?', re.IGNORECASE)
ROLE_SPECIFIC_LIMIT = 6
MIN_TITLE_LENGTH_FOR_ROLE_QA = 8
MIN_SUMMARY_LENGTH_FOR_ROLE_QA = 20


def _ensure_question(text: str) -> str:
    t = text.strip()
    if not t or _META_PREFIX.match(t):
        return ''
    if not t.endswith('?'):
        t = t.rstrip('.') + '?'
    return t


def build_questions_from_title_summary(
    title: str,
    summary: str,
    *,
    limit: int = ROLE_SPECIFIC_LIMIT,
) -> list[str]:
    """Build role/summary-specific candidate questions."""
    questions: list[str] = []
    seen: set[str] = set()
    title = title.strip()
    summary = summary.strip()

    def add(raw: str) -> None:
        q = _ensure_question(raw)
        key = q.lower()
        if not q or key in seen or len(questions) >= limit:
            return
        if _TRUNCATED_ROLE.search(q):
            return
        if (
            len(title) < MIN_TITLE_LENGTH_FOR_ROLE_QA
            and title
            and f'as a {title.lower()}' in q.lower()
        ):
            return
        seen.add(key)
        questions.append(q)

    if len(title) >= MIN_TITLE_LENGTH_FOR_ROLE_QA:
        add(f'What motivated you to pursue a career as a {title}?')
        add(f'What do you enjoy most about the day-to-day work of a {title}?')
        add(
            f'What strengths do you bring as a {title} that you want every '
            'recruiter conversation to cover?'
        )

    if len(summary) >= MIN_SUMMARY_LENGTH_FOR_ROLE_QA:
        add(
            'Looking at your summary, which accomplishment best represents the '
            'impact you want to have next?'
        )
        add(
            'What should recruiters understand about your experience that a CV '
            'alone might not convey?'
        )
        add(
            'Is there a theme in your summary you want the AI to emphasize when '
            'recruiters interview you?'
        )

    if (
        len(title) >= MIN_TITLE_LENGTH_FOR_ROLE_QA
        and len(summary) >= MIN_SUMMARY_LENGTH_FOR_ROLE_QA
    ):
        add(
            f'How does your path as a {title} connect to the direction you '
            'describe in your summary?'
        )

    return questions[:limit]


def _generic_fallback(title: str, *, limit: int = ROLE_SPECIFIC_LIMIT) -> list[str]:
    title = title.strip()
    candidates = [
        'What should recruiters know about your professional background?',
        'What are you most proud of in your recent work?',
        (
            f'As a {title}, what problems do you enjoy solving most?'
            if title
            else 'What strengths would you bring to a new team?'
        ),
        'How do you prefer to collaborate with managers and peers?',
        'What are your expectations around remote work, relocation, or travel?',
        'Is there anything important we have not covered yet?',
    ]
    questions: list[str] = []
    seen: set[str] = set()
    for raw in candidates:
        q = _ensure_question(raw)
        key = q.lower()
        if q and key not in seen and len(questions) < limit:
            seen.add(key)
            questions.append(q)
    return questions


async def generate_personal_qa_questions(profile: dict[str, Any]) -> list[str]:
    """Return up to six role/summary-specific questions (general prompts are added in the client)."""
    title = str(profile.get('title') or '').strip()
    summary = str(profile.get('summary') or '')[:800].strip()

    system = (
        'You write personal reflection questions for a job candidate to answer '
        'on their profile. Use second person (you/your). Questions train an AI '
        'digital twin to sound like them in recruiter interviews. '
        'Base every question on their job title and professional summary only. '
        'Do not ask generic HR questions (salary, team culture, languages, '
        'working environment, relocation, or conflict) — those are already covered. '
        'Do not use meta-phrasing like "Ask about…". '
        'Return exactly 6 questions, one per line, no numbering.'
    )
    prompt = f"""Job title: {title or '(not provided)'}
Professional summary: {summary or '(not provided)'}

Write 6 specific questions about their role and background."""

    raw = await generate_text(prompt, system_instruction=system, max_output_tokens=500)
    if raw:
        lines = [
            ln.strip().lstrip('0123456789.-) ')
            for ln in raw.splitlines()
            if ln.strip()
        ]
        parsed = [_ensure_question(ln) for ln in lines]
        questions = [q for q in parsed if q and len(q) > 10][:ROLE_SPECIFIC_LIMIT]
        if len(questions) >= 3:
            return questions

    built = build_questions_from_title_summary(title, summary)
    if built:
        return built

    return _generic_fallback(title)
