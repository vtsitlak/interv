"""Generate a CV-based work experience overview for the public profile page."""

from __future__ import annotations

import re
from typing import Any

from services.gemini import generate_text

_OUTLINE_PATTERN = re.compile(
    r'^(sentence|paragraph|section|part)\s*\d+\s*[:.)-]',
    re.IGNORECASE | re.MULTILINE,
)


def is_invalid_profile_overview(text: str) -> bool:
    """Detect outline-style model output instead of real prose."""
    stripped = text.strip()
    if not stripped:
        return True
    if _OUTLINE_PATTERN.search(stripped):
        return True
    if re.search(r'introduction,\s*core identity', stripped, re.IGNORECASE):
        return True
    return False


def _qa_snippet(personal_qa: list[dict[str, Any]], limit: int = 3) -> str:
    lines: list[str] = []
    for qa in personal_qa[:limit]:
        answer = str(qa.get('answer') or '').strip()
        if answer:
            lines.append(answer[:350])
    return '\n\n'.join(lines)


async def generate_career_overview(
    *,
    name: str,
    title: str,
    cv_text: str,
    personal_qa: list[dict[str, Any]] | None = None,
) -> str:
    """Write 1–2 paragraphs of work-experience overview from the CV (third person)."""
    cv = cv_text.strip()[:8000]
    if not cv:
        return ''

    first_name = name.strip().split()[0] if name.strip() else 'They'
    role = title.strip() or 'professional'

    system = (
        'You write public profile copy for a hiring platform. '
        'Output only finished prose paragraphs. Never use headings, bullets, '
        'numbered lists, or meta labels such as "Sentence 1" or "Paragraph 2".'
    )
    qa_block = _qa_snippet(personal_qa or [])
    prompt = f"""Write 1–2 short paragraphs summarizing this person's work experience and career background for their public profile.

Rules:
- Base the overview primarily on the CV text below.
- Write in third person (use "{first_name}" or "they").
- Use complete sentences in normal paragraph form only.
- Mention concrete skills, roles, and experience from the CV when present.
- Do not invent employers, dates, or credentials that are not in the CV.
- Do not output an outline, plan, or template — only the final overview text.

Role / title: {role}

CV:
{cv}
{f"Additional context from their answers:{chr(10)}{qa_block}" if qa_block else ""}

Work experience overview:"""

    raw = await generate_text(
        prompt,
        system_instruction=system,
        max_output_tokens=500,
    )
    overview = raw.strip()[:2000]
    if is_invalid_profile_overview(overview):
        return ''
    return overview
