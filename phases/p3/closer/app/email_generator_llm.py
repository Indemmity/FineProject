"""LLM email generator — AI-powered email generation using Llama 3.3 70B.

Post-MVP feature. Falls back to template generation when LLM is unavailable.
"""

from .config import settings
from .personalizer import PersonalizationContext
from .email_generator import generate_email


async def generate_email_llm(
    ctx: PersonalizationContext,
) -> dict[str, str]:
    """Generate a personalised cold email using the LLM.

    In the current implementation this delegates to the template generator.
    When the LLM client is connected (P2.2), this will use the Groq API
    to generate emails with prompt templates from prompts/outreach/.
    """
    # Placeholder: call template generator
    # In production, this would:
    # 1. Load prompt template from prompts/outreach/cold-email.txt
    # 2. Build prompt with company, role, JD excerpt, resume highlights
    # 3. Call llm.complete(prompt)
    # 4. Parse structured JSON response (subject, body_html, body_text)
    # 5. Return the result

    return generate_email(
        template_type="cold",
        job={"title": ctx.role, "company": ctx.company},
        recipient_name=ctx.recipient_name,
        recipient_email=ctx.recipient_email,
        sender_name=ctx.sender_name,
        sender_title=ctx.sender_title,
    )