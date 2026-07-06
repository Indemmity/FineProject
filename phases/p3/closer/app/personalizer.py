"""Personalization engine — extracts personalisation context from job + application data."""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class PersonalizationContext:
    company: str = ""
    role: str = ""
    recipient_name: str = ""
    recipient_email: str = ""
    sender_name: str = ""
    sender_title: str = ""
    job_description: str = ""
    resume_highlights: list[str] = field(default_factory=list)
    company_insight: str = ""
    shared_connection: str = ""


def build_context(
    job: dict[str, Any] | None = None,
    application: dict[str, Any] | None = None,
    recipient_name: str = "",
    recipient_email: str = "",
    sender_name: str = "Hiring Team",
    sender_title: str = "Talent Acquisition",
) -> PersonalizationContext:
    """Build a PersonalizationContext from job and application data."""
    ctx = PersonalizationContext(
        recipient_name=recipient_name or "Hiring Manager",
        recipient_email=recipient_email,
        sender_name=sender_name,
        sender_title=sender_title,
    )

    if job:
        ctx.company = job.get("company", "")
        ctx.role = job.get("title", "")
        ctx.job_description = job.get("description", "")
        ctx.company_insight = _generate_company_insight(job)

    if application:
        ctx.resume_highlights = _extract_highlights(application)

    return ctx


def _generate_company_insight(job: dict[str, Any]) -> str:
    """Generate a personalised company insight based on job data."""
    company = job.get("company", "the company")
    role = job.get("title", "")
    parts = [f"I've been following {company}'s work"]

    description = job.get("description", "")
    if "machine learning" in description.lower() or "ai" in description.lower():
        parts.append("particularly in the AI/ML space")
    elif "full-stack" in description.lower() or "full stack" in description.lower():
        parts.append("especially your engineering innovations")
    elif "product" in description.lower() or "growth" in description.lower():
        parts.append("and your product-led growth")

    if role:
        parts.append(f"the {role} role aligns well with my background")

    return " ".join(parts) + "."


def _extract_highlights(application: dict[str, Any]) -> list[str]:
    """Extract resume highlights from an application."""
    highlights = []
    tailored = application.get("tailored_resume_text", "")
    if tailored:
        lines = [l.strip() for l in tailored.split("\n") if l.strip()]
        highlights = [l for l in lines if len(l) > 40][:3]
    return highlights


def render_intro(ctx: PersonalizationContext) -> str:
    """Render the email intro paragraph."""
    parts = [f"My name is {ctx.sender_name}"]
    if ctx.role:
        parts.append(f"and I'm reaching out regarding the {ctx.role} position")
    if ctx.company:
        parts.append(f"at {ctx.company}")
    parts.append(".")
    return " ".join(parts)


def render_body(ctx: PersonalizationContext) -> str:
    """Render the email body paragraph."""
    parts = []

    if ctx.company_insight:
        parts.append(ctx.company_insight)

    if ctx.resume_highlights:
        parts.append(
            "My background includes: " + "; ".join(ctx.resume_highlights[:2])
        )

    parts.append(
        f"I would welcome the opportunity to discuss how my experience could "
        f"contribute to {ctx.company}'s goals."
    )

    return " ".join(parts)


def render_closing(ctx: PersonalizationContext) -> str:
    """Render the closing paragraph."""
    return (
        f"Would you be available for a brief call next week to discuss this further? "
        f"I look forward to hearing from you."
    )