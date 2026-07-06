"""
Relevance filter — scores and filters job listings based on search criteria.

Filters:
- Keyword relevance scoring
- Location filter
- Remote-only filter
- Experience level matcher
- Date recency
"""

from datetime import datetime, timezone, timedelta
from typing import Any


def keyword_score(job: dict[str, Any], keywords: list[str]) -> float:
    """Score a job's relevance to the given keywords (0.0–1.0)."""
    text_fields = [
        job.get("title") or "",
        job.get("description") or "",
        job.get("company") or "",
    ]
    combined = " ".join(text_fields).lower()

    if not combined:
        return 0.0

    matched = 0
    for kw in keywords:
        kw_lower = kw.lower().strip()
        if kw_lower in combined:
            matched += 1

    if not keywords:
        return 1.0

    return matched / len(keywords)


def passes_location_filter(job: dict[str, Any], location: str | None) -> bool:
    """Check if job passes the location filter."""
    if not location:
        return True
    job_loc = (job.get("location") or "").lower()
    query = location.lower().strip()

    # Remote jobs match any location query
    if "remote" in job_loc:
        return True

    return query in job_loc


def passes_remote_filter(job: dict[str, Any], remote_only: bool) -> bool:
    """Check if job passes the remote-only filter."""
    if not remote_only:
        return True
    return bool(job.get("remote"))


def passes_experience_filter(job: dict[str, Any], level: str | None) -> bool:
    """Check if job passes the experience level filter."""
    if not level:
        return True

    job_level = (job.get("experience_level") or "").lower()
    query = level.lower().strip()

    if not job_level:
        return True  # unknown level matches anything

    LEVEL_ORDER = ["entry", "mid", "senior", "lead"]
    if query in LEVEL_ORDER and job_level in LEVEL_ORDER:
        # Match if job level >= requested level
        return LEVEL_ORDER.index(job_level) >= LEVEL_ORDER.index(query)

    return query == job_level


def passes_date_filter(job: dict[str, Any], days: int | None) -> bool:
    """Check if job was posted within the given number of days."""
    if not days:
        return True

    posted = job.get("posted_date")
    if not posted:
        return True  # unknown date passes

    if isinstance(posted, str):
        try:
            posted = datetime.fromisoformat(posted)
        except (ValueError, TypeError):
            return True

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    return posted >= cutoff


def filter_jobs(
    jobs: list[dict[str, Any]],
    keywords: list[str],
    location: str | None = None,
    remote_only: bool = False,
    experience_level: str | None = None,
    date_posted: int | None = None,
    min_score: float = 0.0,
) -> list[dict[str, Any]]:
    """Filter and score a list of job listings."""
    results = []
    for job in jobs:
        # Apply filters
        if not passes_location_filter(job, location):
            continue
        if not passes_remote_filter(job, remote_only):
            continue
        if not passes_experience_filter(job, experience_level):
            continue
        if not passes_date_filter(job, date_posted):
            continue

        # Score
        score = keyword_score(job, keywords)
        if score < min_score:
            continue

        result = dict(job)
        result["_score"] = round(score, 3)
        results.append(result)

    # Sort by score descending
    results.sort(key=lambda j: j.get("_score", 0), reverse=True)
    return results