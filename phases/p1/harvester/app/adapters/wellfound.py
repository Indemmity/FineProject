"""
Wellfound (AngelList) adapter — Firecrawl-based extraction.

Uses Firecrawl API to scrape job listings from Wellfound search pages.
Falls back to HTTP scraping if Firecrawl key is not configured.
"""

import hashlib
import re
from typing import Any

import httpx
from bs4 import BeautifulSoup

from ..config import settings
from .base import JobSourceAdapter, SearchParams, RawJobListing

SEARCH_URL = "https://wellfound.com/search"


class WellfoundAdapter(JobSourceAdapter):
    @property
    def source_name(self) -> str:
        return "wellfound"

    async def search(self, params: SearchParams) -> list[RawJobListing]:
        keyword_query = "+".join(params.keywords)
        url = f"{SEARCH_URL}?q={keyword_query}"

        # Try Firecrawl first if API key is configured
        if settings.firecrawl_api_key:
            try:
                return await self._search_firecrawl(keyword_query)
            except Exception:
                pass

        # Fallback: try direct HTTP fetch
        try:
            return await self._search_http(url)
        except Exception:
            return []

    async def _search_firecrawl(self, keyword_query: str) -> list[RawJobListing]:
        """Use Firecrawl API to extract job listings."""
        api_url = "https://api.firecrawl.dev/v1/scrape"
        url = f"{SEARCH_URL}?q={keyword_query}"

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                api_url,
                headers={
                    "Authorization": f"Bearer {settings.firecrawl_api_key}",
                    "Content-Type": "application/json",
                },
                json={"url": url, "formats": ["markdown"]},
            )
            response.raise_for_status()
            data = response.json()

        content = data.get("data", {}).get("markdown", "")
        return self._parse_listings(content, keyword_query)

    async def _search_http(self, url: str) -> list[RawJobListing]:
        """HTTP fallback — fetch Wellfound search page and parse."""
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html,application/xhtml+xml",
        }
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, "html.parser")
            text = soup.get_text(separator="\n", strip=True)
            return self._parse_listings(text, keyword_query=url.split("q=")[-1] if "q=" in url else "")

    def _parse_listings(self, content: str, keyword_query: str) -> list[RawJobListing]:
        """Parse job listings from scraped content."""
        listings: list[RawJobListing] = []
        lines = content.split("\n")
        current = {}
        for line in lines:
            line = line.strip()
            if not line:
                if current.get("title"):
                    listing = self._make_listing(current, keyword_query)
                    if listing:
                        listings.append(listing)
                current = {}
                continue

            # Heuristic: pick up lines that look like job attributes
            lower = line.lower()
            if any(kw in lower for kw in ["engineer", "developer", "manager", "designer", "analyst", "scientist"]):
                current["title"] = line
            elif line.startswith("@") or any(site in line for site in [".com", ".io", ".ai"]):
                current["company"] = line.lstrip("@")
            elif any(city in lower for city in ["san francisco", "new york", "remote", "austin", "seattle", "chicago"]):
                current["location"] = line
            elif "$" in line or "₹" in line or "€" in line or "£" in line:
                current["salary"] = line
            elif "full-time" in lower or "part-time" in lower or "contract" in lower:
                current["type"] = line

        return listings

    def _make_listing(self, data: dict[str, str], keyword: str) -> RawJobListing | None:
        title = data.get("title", "").strip()
        company = data.get("company", "").strip()
        if not title or not company:
            return None

        raw_id = hashlib.md5(f"{title}:{company}".encode()).hexdigest()[:12]
        location = data.get("location", "")

        return RawJobListing(
            source="wellfound",
            source_id=raw_id,
            title=title,
            company=company,
            location=location,
            salary_range=data.get("salary"),
            job_type=data.get("type"),
            url=f"{SEARCH_URL}?q={keyword}",
            raw_data=data,
        )

    async def normalize(self, raw: RawJobListing) -> dict[str, Any]:
        from ..normalizer import normalize as _normalize
        return _normalize(raw)