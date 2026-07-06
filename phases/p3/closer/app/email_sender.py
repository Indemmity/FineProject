"""SMTP email sender with dry-run mode and threading support.

Supports:
- STARTTLS for secure connections
- Dry-run mode (log without sending)
- Message-ID and In-Reply-To headers for threading
"""

import logging
import smtplib
import uuid
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, formatdate
from typing import Any

from .config import settings

logger = logging.getLogger(__name__)


class EmailSendResult:
    def __init__(
        self,
        success: bool,
        message_id: str = "",
        error: str | None = None,
    ):
        self.success = success
        self.message_id = message_id
        self.error = error


def send_email(
    to_email: str,
    to_name: str,
    subject: str,
    body_html: str,
    body_text: str,
    from_email: str | None = None,
    from_name: str | None = None,
    reply_to: str | None = None,
    in_reply_to: str | None = None,
) -> EmailSendResult:
    """Send an email via SMTP.

    Args:
        to_email: Recipient email address
        to_name: Recipient display name
        subject: Email subject
        body_html: HTML version of the email body
        body_text: Plain-text version of the email body
        from_email: Override sender email (default from settings)
        from_name: Override sender name (default from settings)
        reply_to: Reply-To header value
        in_reply_to: In-Reply-To header for threading

    Returns:
        EmailSendResult with success status, message_id, and error
    """
    message_id = f"<{uuid.uuid4()}@jobplatform>"
    sender_email = from_email or settings.smtp_user or "noreply@jobplatform.dev"
    sender_name = from_name or settings.sender_name or "Hiring Team"

    # Build MIME message
    msg = MIMEMultipart("alternative")
    msg["From"] = formataddr((sender_name, sender_email))
    msg["To"] = formataddr((to_name, to_email))
    msg["Subject"] = subject
    msg["Message-ID"] = message_id
    msg["Date"] = formatdate(localtime=True)

    if reply_to:
        msg["Reply-To"] = reply_to
    if in_reply_to:
        msg["In-Reply-To"] = in_reply_to

    msg.attach(MIMEText(body_text, "plain", "utf-8"))
    msg.attach(MIMEText(body_html, "html", "utf-8"))

    # Dry-run mode
    if settings.dry_run:
        logger.info(
            "DRY RUN: Would send email",
            extra={
                "to": to_email,
                "subject": subject,
                "message_id": message_id,
            },
        )
        return EmailSendResult(success=True, message_id=message_id)

    # Real send
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            if settings.smtp_user and settings.smtp_password:
                server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(sender_email, [to_email], msg.as_string())

        logger.info("Email sent", extra={
            "to": to_email,
            "subject": subject,
            "message_id": message_id,
        })
        return EmailSendResult(success=True, message_id=message_id)

    except smtplib.SMTPAuthenticationError:
        logger.error("SMTP authentication failed", extra={"host": settings.smtp_host})
        return EmailSendResult(success=False, message_id=message_id, error="SMTP authentication failed")

    except smtplib.SMTPException as e:
        logger.error("SMTP error", extra={"error": str(e)})
        return EmailSendResult(
            success=False, message_id=message_id, error=f"SMTP error: {e}"
        )

    except Exception as e:
        logger.error("Unexpected send error", exc_info=e)
        return EmailSendResult(
            success=False, message_id=message_id, error=str(e)
        )