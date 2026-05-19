"""Configurable API input and quota limits (env-backed)."""

from __future__ import annotations

import os

MAX_CV_CHARS = int(os.getenv('INGEST_MAX_CV_CHARS', '50000'))
MAX_CHAT_MESSAGE_CHARS = int(os.getenv('CHAT_MAX_MESSAGE_CHARS', '4000'))
MAX_QA_QUESTION_CHARS = int(os.getenv('INGEST_MAX_QA_QUESTION_CHARS', '500'))
MAX_QA_ANSWER_CHARS = int(os.getenv('INGEST_MAX_QA_ANSWER_CHARS', '4000'))
MAX_QA_PAIRS = int(os.getenv('INGEST_MAX_QA_PAIRS', '30'))
MAX_LINKS = int(os.getenv('INGEST_MAX_LINKS', '15'))
MAX_LINK_URL_CHARS = int(os.getenv('INGEST_MAX_LINK_URL_CHARS', '100'))
MAX_LINK_DESC_CHARS = int(os.getenv('INGEST_MAX_LINK_DESC_CHARS', '500'))
MAX_TITLE_QUERY_CHARS = int(os.getenv('PROFILE_MAX_TITLE_CHARS', '200'))
MAX_SUMMARY_QUERY_CHARS = int(os.getenv('PROFILE_MAX_SUMMARY_CHARS', '1000'))

INGEST_COOLDOWN_SEC = int(os.getenv('INGEST_COOLDOWN_SEC', '600'))
PERSONAL_QA_MAX_PER_HOUR = int(os.getenv('PERSONAL_QA_MAX_PER_HOUR', '20'))
SUGGESTED_QUESTIONS_MAX_PER_HOUR = int(
    os.getenv('SUGGESTED_QUESTIONS_MAX_PER_HOUR', '60')
)
SUMMARIZE_MAX_PER_HOUR = int(os.getenv('SUMMARIZE_MAX_PER_HOUR', '30'))
