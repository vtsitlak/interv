"""Generate a public-facing career summary from trained profile content."""

from __future__ import annotations

from typing import Any

from services.gemini import generate_text


def _qa_snippet(personal_qa: list[dict[str, Any]], limit: int = 4) -> str:
    lines: list[str] = []
    for qa in personal_qa[:limit]:
        question = str(qa.get('question') or '').strip()
        answer = str(qa.get('answer') or '').strip()
        if question and answer:
            lines.append(f'Q: {question}\nA: {answer[:400]}')
    return '\n\n'.join(lines)


def _links_snippet(links: list[dict[str, Any]], scraped: list[dict[str, Any]]) -> str:
    lines: list[str] = []
    scraped_by_url = {
        str(item.get('link') or ''): str(item.get('text') or '')[:600]
        for item in scraped
    }
    for link in links[:6]:
        href = str(link.get('link') or '').strip()
        if not href:
            continue
        description = str(link.get('description') or '').strip()
        scraped_text = scraped_by_url.get(href, '')
        parts = [p for p in [description, scraped_text[:400] if scraped_text else ''] if p]
        if parts:
            lines.append(f'{href}: ' + ' | '.join(parts))
    return '\n'.join(lines)


async def generate_career_overview(
    *,
    name: str,
    title: str,
    summary: str,
    cv_text: str,
    personal_qa: list[dict[str, Any]],
    links: list[dict[str, Any]],
    scraped_links: list[dict[str, Any]],
    skills: list[str],
) -> str:
    """Write a 3–5 sentence third-person career overview for the profile page."""
    cv = cv_text.strip()[:5000]
    if not cv and not summary.strip() and not personal_qa:
        return ''

    system = (
        'You write concise professional profile copy for a hiring product. '
        'Return only the overview paragraph(s), no headings or bullet lists.'
    )
    skills_line = ', '.join(skills[:15]) if skills else '(not extracted yet)'
    prompt = f"""Write a 3–5 sentence career overview for this candidate's public profile.
Use third person (e.g. "They", "{name.split()[0] if name.strip() else 'They'}").
Summarize career direction, strengths, and what they bring to a role — grounded only in the data below.
Do not invent employers, dates, or credentials not supported by the source material.

Name: {name.strip() or '(not provided)'}
Role / title: {title.strip() or '(not provided)'}
Candidate summary (their own words): {summary.strip()[:800] or '(not provided)'}

CV excerpt:
{cv or '(empty)'}

Personal Q&A:
{_qa_snippet(personal_qa) or '(none)'}

Links (description and scraped notes):
{_links_snippet(links, scraped_links) or '(none)'}

Extracted skills: {skills_line}

Career overview:"""

    raw = await generate_text(
        prompt,
        system_instruction=system,
        max_output_tokens=400,
    )
    return raw.strip()[:2000]
