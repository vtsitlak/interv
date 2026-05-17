"""Suggested starter questions derived from the candidate profile."""

from __future__ import annotations

import re
from typing import Any

from services.gemini import generate_text

_META_PREFIX = re.compile(r'^ask\s+(about|how)\b', re.IGNORECASE)


def _ensure_question(text: str) -> str:
    t = text.strip()
    if not t or _META_PREFIX.match(t):
        return ''
    if not t.endswith('?'):
        t = t.rstrip('.') + '?'
    return t


def build_questions_from_profile(
    profile: dict[str, Any],
    *,
    limit: int = 5,
) -> list[str]:
    """Build recruiter questions from role, skills, summary, and Q&A — no generic list."""
    questions: list[str] = []
    seen: set[str] = set()

    title = str(profile.get('title') or '').strip()
    summary = str(profile.get('summary') or '').strip()
    skills = [
        str(s).strip()
        for s in (profile.get('skills') or [])
        if isinstance(s, str) and str(s).strip()
    ]
    personal_qa = profile.get('personalQA') or []

    def add(raw: str) -> None:
        q = _ensure_question(raw)
        key = q.lower()
        if q and key not in seen and len(questions) < limit:
            seen.add(key)
            questions.append(q)

    if title:
        add(f'As a {title}, what kind of work do you enjoy most in your day to day?')
        add(f'What motivated you to build a career as a {title}?')

    for skill in skills[:4]:
        add(f'How have you used {skill} in your recent work?')

    if summary:
        add(
            'Looking at your background, which accomplishment best represents '
            'the value you would bring to a new team?'
        )

    for qa in personal_qa:
        if not isinstance(qa, dict):
            continue
        question = str(qa.get('question') or '').strip()
        answer = str(qa.get('answer') or '').strip()
        if question and answer:
            add(question)

    for link in (profile.get('links') or [])[:2]:
        if not isinstance(link, dict):
            continue
        href = str(link.get('link') or link.get('url') or '').strip()
        description = str(link.get('description') or link.get('label') or '').strip()
        if description and href and 'linkedin.com' not in href.lower():
            add(f'What should I know from your {description} that is not on your CV?')

    linked_in = str(profile.get('linkedIn') or '').strip()
    if linked_in:
        add(
            'What from your LinkedIn background would you want a recruiter to remember?'
        )

    if len(questions) < limit and title:
        add(
            f'What would you want a hiring manager to understand about your '
            f'strengths as a {title}?'
        )

    return questions[:limit]


async def generate_suggested_questions(profile: dict[str, Any]) -> list[str]:
    name = profile.get('name') or 'the candidate'
    title = profile.get('title') or ''
    summary = (profile.get('summary') or '')[:800]
    cv = (profile.get('cvText') or '')[:1500]
    skills = profile.get('skills') or []
    skills_line = ', '.join(skills[:8]) if skills else ''

    qa_lines: list[str] = []
    for qa in profile.get('personalQA') or []:
        if not isinstance(qa, dict):
            continue
        q = str(qa.get('question') or '').strip()
        a = str(qa.get('answer') or '').strip()
        if q and a:
            qa_lines.append(f'Q: {q} / A: {a[:200]}')
    qa_block = '\n'.join(qa_lines[:6])

    system = (
        'You write short interview questions a recruiter asks directly to a '
        "candidate's AI digital twin. Use second person (you/your). "
        'Each line must be a complete question ending with ?. '
        'Questions must be specific to this person\'s role, skills, summary, and Q&A. '
        'Do not use generic questions that could apply to anyone. '
        'Do not use meta-phrasing like "Ask about…". '
        'Return exactly 5 questions, one per line, no numbering.'
    )
    prompt = f"""Candidate: {name}
Role / title: {title}
Summary: {summary}
Skills: {skills_line}
CV excerpt: {cv}
Their own Q&A from profile:
{qa_block or '(none)'}

Write 5 specific questions tailored to this candidate."""

    raw = await generate_text(prompt, system_instruction=system, max_output_tokens=400)
    if raw:
        lines = [
            ln.strip().lstrip('0123456789.-) ')
            for ln in raw.splitlines()
            if ln.strip()
        ]
        parsed = [_ensure_question(ln) for ln in lines]
        questions = [q for q in parsed if q and len(q) > 10][:5]
        if len(questions) >= 3:
            return questions

    return build_questions_from_profile(profile)
