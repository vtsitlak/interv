"""Transactional email via Resend HTTP API."""

from __future__ import annotations

import logging
import os
from html import escape

import httpx

logger = logging.getLogger(__name__)

RESEND_API_URL = 'https://api.resend.com/emails'


def email_configured() -> bool:
    return bool(os.getenv('RESEND_API_KEY', '').strip())


def _app_base_url() -> str:
    return os.getenv('APP_BASE_URL', 'https://getinterv.web.app').rstrip('/')


def _email_from() -> str:
    return os.getenv('EMAIL_FROM', 'Interv <onboarding@resend.dev>').strip()


async def send_feedback_received_email(
    *,
    to: str,
    candidate_name: str,
    recruiter_name: str,
    score: int,
    feedback_text: str,
    ai_summary: str | None,
) -> None:
    dashboard_url = f'{_app_base_url()}/dashboard'
    summary_block = ''
    if ai_summary and ai_summary.strip():
        summary_block = (
            f'<p style="margin:16px 0 0"><strong>AI summary</strong></p>'
            f'<p style="margin:8px 0 0;color:#444">{escape(ai_summary.strip())}</p>'
        )

    html = f"""
    <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
      <p>Hi {escape(candidate_name)},</p>
      <p><strong>{escape(recruiter_name)}</strong> finished an interview with your AI twin
      and left feedback.</p>
      <p style="margin:16px 0 0"><strong>Score:</strong> {score}/10</p>
      <p style="margin:8px 0 0"><strong>Feedback</strong></p>
      <p style="margin:8px 0 0;color:#444">{escape(feedback_text.strip())}</p>
      {summary_block}
      <p style="margin:24px 0 0">
        <a href="{dashboard_url}" style="color:#2563eb">View on your dashboard</a>
      </p>
    </div>
    """
    await _send_resend(
        to=to,
        subject=f'New interview feedback ({score}/10)',
        html=html,
    )


async def send_feedback_updated_email(
    *,
    to: str,
    candidate_name: str,
    recruiter_name: str,
    score: int,
    feedback_text: str,
) -> None:
    dashboard_url = f'{_app_base_url()}/dashboard'
    html = f"""
    <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
      <p>Hi {escape(candidate_name)},</p>
      <p><strong>{escape(recruiter_name)}</strong> updated their feedback for your interview.</p>
      <p style="margin:16px 0 0"><strong>Score:</strong> {score}/10</p>
      <p style="margin:8px 0 0"><strong>Feedback</strong></p>
      <p style="margin:8px 0 0;color:#444">{escape(feedback_text.strip())}</p>
      <p style="margin:24px 0 0">
        <a href="{dashboard_url}" style="color:#2563eb">View on your dashboard</a>
      </p>
    </div>
    """
    await _send_resend(
        to=to,
        subject=f'Interview feedback updated ({score}/10)',
        html=html,
    )


async def _send_resend(*, to: str, subject: str, html: str) -> None:
    api_key = os.getenv('RESEND_API_KEY', '').strip()
    if not api_key:
        logger.warning('RESEND_API_KEY not set; skipping email to %s', to)
        return

    payload = {
        'from': _email_from(),
        'to': [to],
        'subject': subject,
        'html': html,
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(
            RESEND_API_URL,
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json',
            },
            json=payload,
        )

    if response.status_code >= 400:
        logger.error(
            'Resend API error %s for %s: %s',
            response.status_code,
            to,
            response.text[:500],
        )
        raise RuntimeError('Failed to send notification email')
