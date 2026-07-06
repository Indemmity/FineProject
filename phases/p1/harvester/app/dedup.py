"""
Deduplication engine — identifies duplicate job listings using fuzzy matching.

Strategy:
1. Exact URL match (fast path)
2. Exact source + source_id match
3. Fuzzy title match using token_set_ratio (handles subsets like
   "Senior Software Engineer" vs "Software Engineer")
   **AND** fuzzy company match
"""

from typing import Any

from thefuzz import fuzz


TITLE_THRESHOLD = 80
COMPANY_THRESHOLD = 82


def _normalize(text: str) -> str:
    import re
    return re.sub(r"\s+", " ", text.lower().strip())


def is_duplicate(
    existing: dict[str, Any],
    candidate: dict[str, Any],
    title_threshold: int = TITLE_THRESHOLD,
    company_threshold: int = COMPANY_THRESHOLD,
) -> bool:
    """Check if candidate is a duplicate of an existing job listing."""

    # 1. Exact URL match
    existing_url = (existing.get("url") or "").strip().lower()
    candidate_url = (candidate.get("url") or "").strip().lower()
    if existing_url and candidate_url and existing_url == candidate_url:
        return True

    # 2. Exact source + source_id match
    if (
        existing.get("source") and candidate.get("source")
        and existing.get("source") == candidate.get("source")
        and existing.get("source_id") and candidate.get("source_id")
        and existing.get("source_id") == candidate.get("source_id")
    ):
        return True

    # 3. Fuzzy title AND company match (both must meet thresholds)
    existing_title = _normalize(existing.get("title") or "")
    candidate_title = _normalize(candidate.get("title") or "")

    if not existing_title or not candidate_title:
        return False

    # token_set_ratio handles subsets well: "Software Engineer" is a subset
    # of "Senior Software Engineer" → score = 100
    title_score = fuzz.token_set_ratio(existing_title, candidate_title)
    if title_score < title_threshold:
        return False

    existing_company = _normalize(existing.get("company") or "")
    candidate_company = _normalize(candidate.get("company") or "")

    if existing_company and candidate_company:
        company_score = fuzz.token_set_ratio(existing_company, candidate_company)
        return company_score >= company_threshold

    # If only one side has a company name, rely on high title score
    return title_score >= title_threshold + 5


def deduplicate(
    candidates: list[dict[str, Any]],
    existing: list[dict[str, Any]] | None = None,
    title_threshold: int = TITLE_THRESHOLD,
    company_threshold: int = COMPANY_THRESHOLD,
) -> list[dict[str, Any]]:
    """Remove duplicates from a list of candidates, optionally against existing records."""
    seen: list[dict[str, Any]] = list(existing) if existing else []

    unique: list[dict[str, Any]] = []
    for candidate in candidates:
        if any(is_duplicate(s, candidate, title_threshold, company_threshold) for s in seen):
            continue
        seen.append(candidate)
        unique.append(candidate)

    return unique