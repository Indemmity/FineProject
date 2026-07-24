"""
Normalizer — transforms raw scraped data into structured NormalizedJob dicts.

Handles:
- Date parsing across formats
- Salary extraction and normalisation
- Location normalisation (remote/CBD/city extraction)
- Experience level inference
"""

import re
from datetime import datetime, timezone
from typing import Any

from .adapters.base import RawJobListing


MONTH_NAMES = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}

DATE_PATTERNS = [
    # ISO / standard
    (r"(\d{4})-(\d{2})-(\d{2})", lambda y, m, d: (int(y), int(m), int(d))),
    # "2024-03-15T10:30:00Z"
    (r"(\d{4})-(\d{2})-(\d{2})T", lambda y, m, d: (int(y), int(m), int(d))),
    # "Mar 15, 2024" / "March 15, 2024"
    (r"([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})", lambda m, d, y: (int(y), MONTH_NAMES.get(m.lower(), 1), int(d))),
    # "15 Mar 2024" / "15 March 2024"
    (r"(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})", lambda d, m, y: (int(y), MONTH_NAMES.get(m.lower(), 1), int(d))),
    # "2024-03-15" (already covered, but explicit for ordinal month-day)
    # Relative: "2 days ago", "3 weeks ago", "1 month ago"
    (r"(\d+)\s*(day|days?)\s*ago", lambda n, _: _relative_date(int(n))),
    (r"(\d+)\s*(week|weeks?)\s*ago", lambda n, _: _relative_date(int(n) * 7)),
    (r"(\d+)\s*(month|months?)\s*ago", lambda n, _: _relative_date(int(n) * 30)),
    (r"(\d+)\s*(year|years?)\s*ago", lambda n, _: _relative_date(int(n) * 365)),
    # "Today"
    (r"(?i)^today$", lambda: _relative_date(0)),
    (r"(?i)^yesterday$", lambda: _relative_date(1)),
    # "Just posted" / "Just now"
    (r"(?i)just\s*(?:posted|now)", lambda: _relative_date(0)),
    # "Posted 5 hours ago" — treat as today
    (r"(\d+)\s*hours?\s*ago", lambda n: _relative_date(0)),
    # "30+ days ago"
    (r"(\d+)\+?\s*days?\s*ago", lambda n: _relative_date(int(n))),
]

REMOTE_KEYWORDS = [
    "remote", "work from home", "wfh", "fully remote", "100% remote",
    "virtual", "telecommute", "hybrid",
]

SENIORITY_KEYWORDS: dict[str, int] = {
    "entry": 0, "junior": 0, "trainee": 0, "intern": 0, "graduate": 0,
    "mid": 1, "intermediate": 1, "associate": 1,
    "senior": 2, "sr": 2, "lead": 2, "staff": 2,
    "principal": 3, "director": 3, "head": 3, "chief": 3, "vp": 3,
}


def _relative_date(days_ago: int) -> tuple[int, int, int]:
    d = datetime.now(timezone.utc)
    from datetime import timedelta
    d -= timedelta(days=days_ago)
    return (d.year, d.month, d.day)


def parse_date(text: str | None) -> datetime | None:
    """Try to extract a datetime from a date string. Returns None on failure."""
    if not text or not text.strip():
        return None
    text = text.strip()
    for pattern, handler in DATE_PATTERNS:
        m = re.search(pattern, text)
        if m:
            try:
                groups = m.groups()
                if callable(handler):
                    result = handler(*groups)
                else:
                    result = handler(*groups)
                if isinstance(result, tuple) and len(result) == 3:
                    y, mo, d = result
                    return datetime(y, mo, d, tzinfo=timezone.utc)
            except (ValueError, OverflowError):
                continue
    return None


SALARY_PATTERNS = [
    # "$100k - $150k" / "$100,000 - $150,000"
    (r"\$?(\d{3,})\s*k\s*[-–to]+\s*\$?(\d{3,})\s*k", lambda l, u: f"${l}k - ${u}k"),
    # "$100,000 - $150,000"
    (r"\$?([\d,]+)\s*[-–to]+\s*\$?([\d,]+)", lambda l, u: f"${l} - ${u}"),
    # "$100,000+" / "$100k+"
    (r"\$?(\d{3,})\s*k\+", lambda n: f"${n}k+"),
    (r"\$?([\d,]+)\+", lambda n: f"${n}+"),
    # "₹12LPA - ₹15LPA" (Indian lakhs)
    (r"(?:₹|INR)\s*(\d+)\s*L\s*[-–to]+\s*(?:₹|INR)\s*(\d+)\s*L", lambda l, u: f"₹{l}L - ₹{u}L"),
    (r"(?:₹|INR)\s*(\d+)\s*L", lambda n: f"₹{n}L"),
    # "€50,000 - €70,000"
    (r"€\s*([\d,]+)\s*[-–to]+\s*€\s*([\d,]+)", lambda l, u: f"€{l} - €{u}"),
    # "£40,000 - £55,000"
    (r"£\s*([\d,]+)\s*[-–to]+\s*£\s*([\d,]+)", lambda l, u: f"£{l} - £{u}"),
    # Generic: "Negotiable", "DOE", "Competitive"
    (r"(?i)(negotiable|doe|competitive)", lambda m: m.capitalize()),
]


def extract_salary(text: str | None) -> str | None:
    """Try to extract a salary string from text."""
    if not text:
        return None
    for pattern, formatter in SALARY_PATTERNS:
        m = re.search(pattern, text.strip())
        if m:
            try:
                return str(formatter(*m.groups()))
            except (ValueError, IndexError):
                continue
    return text.strip() if text.strip() else None


def normalize_location(location: str | None) -> str | None:
    """Normalize a location string."""
    if not location:
        return None
    loc = location.strip()
    if not loc:
        return None
    # "Remote / Anywhere" → "Remote"
    if re.search(r"(?i)remote|anywhere|work from home", loc):
        return "Remote"
    # "San Francisco, CA" → keep as-is
    return loc


def infer_experience_level(title: str | None) -> str | None:
    """Infer experience level from job title."""
    if not title:
        return None
    lower = title.lower()
    # Check for seniority keywords in title
    scores = {}
    for keyword, level in SENIORITY_KEYWORDS.items():
        if keyword in lower:
            level_name = ["entry", "mid", "senior", "lead"][level]
            scores[level_name] = scores.get(level_name, 0) + 1
    if scores:
        return max(scores, key=scores.get)
    return "mid"  # default


def infer_remote(text: str | None) -> bool:
    """Check if a text snippet indicates remote work."""
    if not text:
        return False
    lower = text.lower()
    return any(kw in lower for kw in REMOTE_KEYWORDS)


def normalize(raw: RawJobListing) -> dict[str, Any]:
    """Convert a RawJobListing into a NormalizedJob dict matching the DB schema."""
    posted_date = parse_date(raw.posted_date)
    salary = extract_salary(raw.salary_range)
    location = normalize_location(raw.location)

    return {
        "source": raw.source,
        "source_id": raw.source_id,
        "title": raw.title.strip(),
        "company": raw.company.strip(),
        "location": location,
        "description": raw.description.strip() if raw.description else "",
        "description_html": raw.description_html.strip() if raw.description_html else "",
        "salary_range": salary,
        "job_type": raw.job_type,
        "remote": raw.remote or infer_remote(raw.title) or infer_remote(raw.description),
        "experience_level": raw.experience_level or infer_experience_level(raw.title),
        "posted_date": posted_date,
        "url": raw.url.strip() if raw.url else "",
        "raw": raw.raw_data,
    }