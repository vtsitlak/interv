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


async def extract_skills_from_cv(cv_text: str, title: str = '') -> list[str]:
    snippet = cv_text.strip()[:6000]
    if not snippet:
        return []

    system = (
        'Return only a comma-separated list of 6–12 concise skill labels '
        '(technologies, tools, domains) found in the CV. No sentences.'
    )
    prompt = f"""Job title: {title or 'Professional'}

CV:
{snippet}

Skills:"""

    raw = await generate_text(prompt, system_instruction=system, max_output_tokens=200)
    if raw:
        parts = re.split(r'[,;\n]+', raw)
        skills = [p.strip().strip('.-') for p in parts if p.strip()]
        skills = [s for s in skills if 1 < len(s) < 40][:12]
        if skills:
            return skills

    return extract_skills_heuristic(cv_text)
