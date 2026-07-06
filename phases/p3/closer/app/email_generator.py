"""Email generator — template-based cold email generation using Jinja2.

Supports:
- Cold email (initial outreach)
- Follow-up email
- HTML and plain-text variants
"""

from pathlib import Path
from jinja2 import Template, TemplateNotFound

from .config import settings
from .personalizer import (
    PersonalizationContext,
    build_context,
    render_intro,
    render_body,
    render_closing,
    render_body as render_followup_body,
)

TEMPLATES_DIR = Path(__file__).parent / "templates"

_TEMPLATE_CACHE: dict[str, Template] = {}


def _load_template(name: str) -> Template:
    """Load a Jinja2 template, cached."""
    if name not in _TEMPLATE_CACHE:
        path = TEMPLATES_DIR / name
        if not path.exists():
            raise FileNotFoundError(f"Template not found: {path}")
        _TEMPLATE_CACHE[name] = Template(path.read_text(encoding="utf-8"))
    return _TEMPLATE_CACHE[name]


def generate_email(
    template_type: str = "cold",
    job: dict | None = None,
    application: dict | None = None,
    recipient_name: str = "",
    recipient_email: str = "",
    sender_name: str | None = None,
    sender_title: str | None = None,
) -> dict[str, str]:
    """Generate an email (HTML + text) from templates and personalisation context.

    Args:
        template_type: "cold" or "follow_up"
        job: Job data dict (title, company, description, etc.)
        application: Application data dict
        recipient_name: Name of the recipient
        recipient_email: Email of the recipient
        sender_name: Override sender name (default from settings)
        sender_title: Override sender title (default from settings)

    Returns:
        dict with keys: subject, body_html, body_text
    """
    ctx = build_context(
        job=job,
        application=application,
        recipient_name=recipient_name,
        recipient_email=recipient_email,
        sender_name=sender_name or settings.sender_name or "Hiring Team",
        sender_title=sender_title or "Talent Acquisition",
    )

    intro = render_intro(ctx)
    body = render_body(ctx)
    closing = render_closing(ctx)

    template_vars = {
        "company": ctx.company,
        "role": ctx.role,
        "recipient_name": ctx.recipient_name,
        "recipient_email": ctx.recipient_email,
        "sender_name": ctx.sender_name,
        "sender_title": ctx.sender_title,
        "intro_paragraph": intro,
        "body_paragraph": body,
        "closing_paragraph": closing,
        "unsubscribe_url": "#",
    }

    if template_type == "cold":
        html_template = _load_template("cold_email.html")
        text_template = _load_template("cold_email.txt")
        subject = f"Exploring opportunities at {ctx.company}"
    elif template_type == "follow_up":
        html_template = _load_template("follow_up.html")
        text_template = _load_template("follow_up.txt")
        subject = f"Following up — {ctx.role} at {ctx.company}"
    else:
        raise ValueError(f"Unknown template type: {template_type}")

    body_html = html_template.render(**template_vars)
    body_text = text_template.render(**template_vars)

    return {
        "subject": subject,
        "body_html": body_html,
        "body_text": body_text,
    }