"""
RemoteOK adapter — public API client at https://remoteok.com/api.

RemoteOK has a free, no-auth JSON API. Returns all listings; we filter on the client side.
"""

import hashlib
from datetime import datetime, timezone
from typing import Any

import httpx

from .base import JobSourceAdapter, SearchParams, RawJobListing

API_URL = "https://remoteok.com/api"


class RemoteOKAdapter(JobSourceAdapter):
    @property
    def source_name(self) -> str:
        return "remoteok"

    async def search(self, params: SearchParams) -> list[RawJobListing]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(API_URL, headers={"User-Agent": "JobPlatform/1.0"})
            response.raise_for_status()
            data = response.json()

        listings: list[RawJobListing] = []
        # First item is usually metadata; the rest are jobs
        for item in data:
            if not isinstance(item, dict) or "id" not in item:
                continue
            raw = self._parse_item(item)
            listings.append(raw)

        return listings

    def _parse_item(self, item: dict[str, Any]) -> RawJobListing:
        raw_id = str(item.get("id", ""))
        source_id = hashlib.md5(raw_id.encode()).hexdigest()[:12]

        title = item.get("position", "") or ""
        company = item.get("company", "") or ""
        description = item.get("description", "") or ""
        location = item.get("location", "") or "Remote"
        salary = item.get("salary", "") or None
        url = item.get("url", "") or ""
        date_str = item.get("date", "") or ""

        # Remove HTML tags for plain text description
        import re
        text_desc = re.sub(r"<[^>]+>", " ", description).strip()

        return RawJobListing(
            source="remoteok",
            source_id=source_id,
            title=title.strip(),
            company=company.strip(),
            location=location.strip(),
            description=text_desc,
            description_html=description,
            salary_range=salary.strip() if salary else None,
            job_type="full-time",
            remote=True,  # RemoteOK is all-remote
            posted_date=date_str,
            url=url.strip(),
            raw_data=item,
        )

    async def normalize(self, raw: RawJobListing) -> dict[str, Any]:
        """Let the shared normalizer handle this."""
        from ..normalizer import normalize as _normalize
        return _normalize(raw)