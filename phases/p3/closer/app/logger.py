"""Outreach logger — logs every send attempt to the outreach_logs table.

In the current implementation, this uses in-memory storage.
In production, it would use the database.
"""

import uuid
import hashlib
import logging
from datetime import datetime, timezone
from typing import Any
from collections import defaultdict

logger = logging.getLogger(__name__)


class OutreachLogger:
    """In-memory outreach logger."""

    def __init__(self):
        self._logs: list[dict[str, Any]] = []
        self._index: dict[str, list[int]] = defaultdict(list)  # user_id → log indices

    def log_send(
        self,
        application_id: str,
        user_id: str,
        recipient_email: str,
        recipient_name: str,
        subject: str,
        status: str = "sent",
        error: str | None = None,
    ) -> str:
        """Log a send attempt. Returns the log entry ID."""
        log_id = str(uuid.uuid4())
        entry = {
            "id": log_id,
            "application_id": application_id,
            "user_id": user_id,
            "recipient_email": recipient_email,
            "recipient_name": recipient_name,
            "subject": subject,
            "subject_hash": hashlib.sha256(subject.encode()).hexdigest()[:16],
            "status": status,
            "delivery_status": "pending" if status == "sent" else status,
            "error_message": error,
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "opened_at": None,
            "replied_at": None,
        }
        self._logs.append(entry)
        self._index[user_id].append(len(self._logs) - 1)
        logger.info("Send logged", extra={"log_id": log_id, "status": status})
        return log_id

    def update_delivery_status(
        self, log_id: str, status: str, error: str | None = None
    ) -> bool:
        """Update delivery status for a log entry."""
        for entry in self._logs:
            if entry["id"] == log_id:
                entry["delivery_status"] = status
                if error:
                    entry["error_message"] = error
                if status == "opened":
                    entry["opened_at"] = datetime.now(timezone.utc).isoformat()
                elif status == "replied":
                    entry["replied_at"] = datetime.now(timezone.utc).isoformat()
                return True
        return False

    def get_logs(
        self,
        user_id: str,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        """Get logs for a user with optional filtering and pagination."""
        indices = list(self._index.get(user_id, []))
        logs = [self._logs[i] for i in indices]

        if status:
            logs = [l for l in logs if l["status"] == status]

        return logs[offset : offset + limit]

    def get_stats(self, user_id: str) -> dict[str, Any]:
        """Get aggregated stats for a user."""
        indices = self._index.get(user_id, [])
        logs = [self._logs[i] for i in indices]
        total = len(logs)
        sent = len([l for l in logs if l["status"] == "sent"])
        opened = len([l for l in logs if l["opened_at"]])
        replied = len([l for l in logs if l["replied_at"]])
        bounced = len([l for l in logs if l["delivery_status"] == "bounced"])
        failed = len([l for l in logs if l["status"] == "failed"])

        return {
            "total": total,
            "sent": sent,
            "opened": opened,
            "replied": replied,
            "bounced": bounced,
            "failed": failed,
            "open_rate": round(opened / sent * 100, 1) if sent > 0 else 0,
            "reply_rate": round(replied / sent * 100, 1) if sent > 0 else 0,
            "bounce_rate": round(bounced / sent * 100, 1) if sent > 0 else 0,
        }

    def export_csv(self, user_id: str) -> str:
        """Export logs as CSV string."""
        indices = self._index.get(user_id, [])
        logs = [self._logs[i] for i in indices]

        headers = [
            "id", "application_id", "recipient_email", "recipient_name",
            "subject", "status", "delivery_status", "sent_at",
            "opened_at", "replied_at", "error_message",
        ]
        lines = [",".join(f'"{h}"' for h in headers)]
        for log in logs:
            row = [str(log.get(h, "")) for h in headers]
            lines.append(",".join(f'"{v}"' for v in row))
        return "\n".join(lines)


# Global logger instance
outreach_logger = OutreachLogger()