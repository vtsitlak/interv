"""Extract skill tags from CV text."""

from __future__ import annotations

import re

from services.gemini import generate_text

# Common tech / role keywords for heuristic fallback
_KNOWN_SKILLS = [
    'Angular', 'React', 'Vue', 'TypeScript', 'JavaScript', 'Python', 'Java',
    'Node.js', 'FastAPI', 'Firebase', 'Firestore', 'AWS', 'Azure', 'GCP',
    'Docker', 'Kubernetes', 'PostgreSQL', 'MongoDB', 'Redis', 'GraphQL',
    'REST', 'RxJS', 'NgRx', 'Tailwind', 'CSS', 'HTML', 'Git', 'CI/CD',
    'Agile', 'Scrum', 'Leadership', 'Mentoring', 'AI', 'Machine Learning',
    'LLM', 'RAG', 'Gemini', 'OpenAI',
]


def extract_skills_heuristic(cv_text: str, limit: int = 12) -> list[str]:
    found: list[str] = []
    lower = cv_text.lower()
    for skill in _KNOWN_SKILLS:
        if skill.lower() in lower and skill not in found:
            found.append(skill)
        if len(found) >= limit:
            break
    return found


def _build_skills_context(
    cv_text: str,
    title: str,
    summary: str,
    personal_qa: list[dict],
    links: list[dict],
) -> str:
    parts: list[str] = []
    if title.strip():
        parts.append(f'Job title: {title.strip()}')
    if summary.strip():
        parts.append(f'Summary: {summary.strip()[:600]}')
    cv = cv_text.strip()[:5000]
    if cv:
        parts.append(f'CV:\n{cv}')
    for qa in personal_qa[:4]:
        answer = str(qa.get('answer') or '').strip()
        if answer:
            parts.append(f'Q&A answer: {answer[:300]}')
    for link in links[:6]:
        desc = str(link.get('description') or '').strip()
        href = str(link.get('link') or '').strip()
        if desc:
            parts.append(f'Link note ({href or "url"}): {desc[:200]}')
    return '\n\n'.join(parts)


async def extract_skills_from_cv(
    cv_text: str,
    title: str = '',
    summary: str = '',
    personal_qa: list[dict] | None = None,
    links: list[dict] | None = None,
) -> list[str]:
    context = _build_skills_context(
        cv_text,
        title,
        summary,
        personal_qa or [],
        links or [],
    )
    if not context.strip():
        return []

    system = (
        'Return only a comma-separated list of 8–15 concise skill labels '
        '(technologies, tools, frameworks, domains, soft skills) evidenced in the '
        'material. No sentences. No duplicates.'
    )
    prompt = f"""{context}

Skills:"""

    raw = await generate_text(prompt, system_instruction=system, max_output_tokens=280)
    if raw:
        parts = re.split(r'[,;\n]+', raw)
        skills = [p.strip().strip('.-') for p in parts if p.strip()]
        skills = [s for s in skills if 1 < len(s) < 40][:15]
        if skills:
            return skills

    return extract_skills_heuristic(cv_text, limit=15)
