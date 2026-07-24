"""Outreach logger — logs every send attempt to a local SQLite database."""

import uuid
import hashlib
import logging
from datetime import datetime, timezone
from typing import Any

from . import db

logger = logging.getLogger(__name__)


class OutreachLogger:
    """Outreach logger backed by SQLite."""

    def log_send(
        self,
        application_id: str,
        user_id: str,
        recipient_email: str,
        recipient_name: str,
        subject: str,
        status: str = "sent",
        error: str | None = None,
        body_html: str = "",
        body_text: str = "",
        company_name: str = "",
        job_title: str = "",
    ) -> str:
        """Log a send attempt. Returns the log entry ID."""
        log_id = str(uuid.uuid4())
        entry = {
            "id": log_id,
            "application_id": application_id,
            "user_id": user_id,
            "recipient_email": recipient_email,
            "recipient_name": recipient_name,
            "company_name": company_name,
            "job_title": job_title,
            "subject": subject,
            "subject_hash": hashlib.sha256(subject.encode()).hexdigest()[:16],
            "status": status,
            "delivery_status": "pending" if status == "sent" else status,
            "error_message": error,
            "body_html": body_html,
            "body_text": body_text,
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "opened_at": None,
            "replied_at": None,
        }
        db.insert_log(entry)
        logger.info("Send logged", extra={"log_id": log_id, "status": status})
        return log_id

    def update_delivery_status(
        self, log_id: str, status: str, error: str | None = None
    ) -> bool:
        """Update delivery status for a log entry."""
        extras = {"delivery_status": status}
        if error:
            extras["error_message"] = error
        if status == "opened":
            extras["opened_at"] = datetime.now(timezone.utc).isoformat()
            extras["status"] = "opened"
        elif status == "replied":
            extras["replied_at"] = datetime.now(timezone.utc).isoformat()
        return db.update_log(log_id, **extras)

    def update_log_status(
        self, log_id: str, status: str, extras: dict | None = None
    ) -> bool:
        """Update the top-level status of a log entry (e.g. draft -> sent / cancelled)."""
        updates = {"status": status}
        if extras:
            updates.update(extras)
        if status == "sent":
            updates["sent_at"] = datetime.now(timezone.utc).isoformat()
            updates["delivery_status"] = "delivered"
        elif status == "cancelled":
            updates["delivery_status"] = "cancelled"
        return db.update_log(log_id, **updates)

    def get_log_entry(self, log_id: str) -> dict[str, Any] | None:
        """Get a single log entry by ID."""
        return db.get_log(log_id)

    def get_logs(
        self,
        user_id: str,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        """Get logs for a user with optional filtering and pagination."""
        return db.get_logs(user_id, status, limit, offset)

    def get_stats(self, user_id: str) -> dict[str, Any]:
        """Get aggregated stats for a user."""
        return db.get_stats(user_id)

    def export_csv(self, user_id: str) -> str:
        """Export logs as CSV string."""
        return db.export_csv(user_id)


# Global logger instance
outreach_logger = OutreachLogger()
