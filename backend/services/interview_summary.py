"""Generate a short AI summary of a completed interview."""

from __future__ import annotations

from typing import Any

from services.gemini import generate_chat_text


def _format_transcript(messages: list[dict[str, Any]], candidate_name: str) -> str:
    lines: list[str] = []
    for msg in messages:
        role = msg.get('role', 'user')
        content = (msg.get('content') or '').strip()
        if not content:
            continue
        speaker = 'Recruiter' if role == 'user' else candidate_name
        lines.append(f'{speaker}: {content}')
    return '\n'.join(lines)


async def generate_interview_summary(
    *,
    candidate_name: str,
    recruiter_name: str,
    messages: list[dict[str, Any]],
) -> str:
    transcript = _format_transcript(messages, candidate_name)
    if not transcript.strip():
        return (
            'The recruiter opened an interview session but no messages were recorded.'
        )

    system = (
        'You write concise, professional interview recap notes for hiring teams. '
        'Use third person for the candidate. Do not invent facts beyond the transcript.'
    )
    prompt = f"""Write a 3–5 sentence summary of what the recruiter learned in this AI twin interview.

Candidate: {candidate_name}
Recruiter: {recruiter_name}

Transcript:
{transcript[:12000]}

Summary:"""

    summary = await generate_chat_text(
        prompt, system_instruction=system, max_output_tokens=400
    )
    if summary:
        return summary

    return (
        f'{recruiter_name} interviewed {candidate_name}\'s AI twin. '
        f'The conversation included {len(messages)} messages. '
        'Review the full transcript for details.'
    )
