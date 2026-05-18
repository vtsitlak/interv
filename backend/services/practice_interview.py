"""Detect self-test (practice) interviews — no recruiter feedback emails."""

from __future__ import annotations

from typing import Any

PRACTICE_RECRUITER_NAME = 'Practice session'
PRACTICE_RECRUITER_ROLE = 'Self-test'
PRACTICE_RECRUITER_COMPANY = ''


def is_practice_interview(data: dict[str, Any]) -> bool:
    return (
        str(data.get('recruiterName') or '').strip() == PRACTICE_RECRUITER_NAME
        and str(data.get('recruiterRole') or '').strip() == PRACTICE_RECRUITER_ROLE
        and str(data.get('recruiterCompany') or '').strip() == PRACTICE_RECRUITER_COMPANY
    )
