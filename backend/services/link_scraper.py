"""Fetch readable text from profile links (GitHub API, generic HTML; skip LinkedIn)."""

from __future__ import annotations

import logging
from typing import Any
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}

GITHUB_ACCEPT = {"Accept": "application/vnd.github.v3+json"}


def extract_github_username(url: str) -> str | None:
    """Extract GitHub username from a GitHub profile URL."""
    parsed = urlparse(url.strip())
    if "github.com" not in parsed.netloc.lower():
        return None
    parts = [p for p in parsed.path.strip("/").split("/") if p]
    return parts[0] if parts else None


def is_linkedin(url: str) -> bool:
    return "linkedin.com" in urlparse(url.strip()).netloc.lower()


async def scrape_github(username: str) -> str:
    """Fetch GitHub profile and recent public repos via the GitHub API."""
    async with httpx.AsyncClient(timeout=10) as client:
        texts: list[str] = []

        resp = await client.get(
            f"https://api.github.com/users/{username}",
            headers=GITHUB_ACCEPT,
        )
        if resp.status_code == 200:
            data = resp.json()
            bio = data.get("bio") or ""
            company = data.get("company") or ""
            location = data.get("location") or ""
            texts.append(
                f"GitHub profile for {username}.\n"
                f"Bio: {bio}\nCompany: {company}\nLocation: {location}"
            )

        repos_resp = await client.get(
            f"https://api.github.com/users/{username}/repos",
            params={"sort": "updated", "per_page": 10},
            headers=GITHUB_ACCEPT,
        )
        if repos_resp.status_code == 200:
            repos = repos_resp.json()
            repo_lines: list[str] = []
            for repo in repos:
                name = repo.get("name", "")
                desc = repo.get("description") or ""
                lang = repo.get("language") or ""
                stars = repo.get("stargazers_count", 0)
                repo_lines.append(f"- {name} ({lang}, stars {stars}): {desc}")
            if repo_lines:
                texts.append("GitHub repositories:\n" + "\n".join(repo_lines))

        return "\n\n".join(texts)


async def scrape_generic_url(url: str) -> str:
    """Fetch and extract readable text from a generic webpage."""
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            resp = await client.get(url.strip(), headers=HEADERS)
            if resp.status_code != 200:
                return ""

            soup = BeautifulSoup(resp.text, "html.parser")
            for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
                tag.decompose()

            lines = [
                line.strip()
                for line in soup.get_text(separator="\n").splitlines()
                if line.strip()
            ]
            return "\n".join(lines)[:8000]
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to scrape %s: %s", url, exc)
        return ""


async def scrape_link(label: str, url: str) -> dict[str, str] | None:
    """
    Scrape a single link and return label, url, and text.
    Returns None if scraping fails or is not supported (e.g. LinkedIn).
    """
    url = (url or "").strip()
    if not url:
        return None

    if is_linkedin(url):
        return None

    github_username = extract_github_username(url)
    if github_username:
        text = await scrape_github(github_username)
    else:
        text = await scrape_generic_url(url)

    if not text.strip():
        return None

    return {"label": (label or url).strip(), "url": url, "text": text}


async def scrape_all_links(links: list[dict[str, Any]]) -> list[dict[str, str]]:
    """Scrape all links and return successfully scraped ones."""
    results: list[dict[str, str]] = []
    for link in links:
        url = (link.get("url") or "").strip()
        if not url:
            continue
        result = await scrape_link(link.get("label", ""), url)
        if result:
            results.append(result)
    return results
