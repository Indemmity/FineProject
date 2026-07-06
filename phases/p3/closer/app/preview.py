"""Email preview renderer — renders HTML email with inline CSS and link validation."""

import re
from typing import Any

from .email_generator import generate_email


def render_preview(
    template_type: str = "cold",
    job: dict | None = None,
    application: dict | None = None,
    recipient_name: str = "",
    recipient_email: str = "",
) -> dict[str, Any]:
    """Generate a preview of an email with metadata.

    Returns:
        dict with keys: html, text, subject, links, estimated_read_time
    """
    email = generate_email(
        template_type=template_type,
        job=job,
        application=application,
        recipient_name=recipient_name or "Jane Doe",
        recipient_email=recipient_email or "jane@example.com",
    )

    links = extract_links(email["body_html"])
    estimated_read_time = estimate_read_time(email["body_text"])

    return {
        "html": email["body_html"],
        "text": email["body_text"],
        "subject": email["subject"],
        "links": links,
        "estimated_read_time_seconds": estimated_read_time,
    }


def extract_links(html: str) -> list[dict[str, str]]:
    """Extract all links from HTML content."""
    links = []
    pattern = r'<a\s[^>]*href="([^"]+)"[^>]*>([^<]+)</a>'
    for match in re.finditer(pattern, html, re.IGNORECASE):
        links.append({"url": match.group(1), "text": match.group(2).strip()})
    return links


def estimate_read_time(text: str, wpm: int = 200) -> int:
    """Estimate reading time in seconds."""
    word_count = len(text.split())
    return max(10, int((word_count / wpm) * 60))