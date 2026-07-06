"""Delivery status tracking — updates outreach_logs on delivery notifications."""

from .logger import outreach_logger


def track_delivery(
    log_id: str,
    event: str,
    error: str | None = None,
) -> bool:
    """Record a delivery event for a sent email.

    Args:
        log_id: The log entry ID returned by log_send()
        event: "delivered" | "bounced" | "opened" | "replied" | "failed"
        error: Optional error message

    Returns:
        True if the log entry was found and updated
    """
    status_map = {
        "delivered": "delivered",
        "bounced": "bounced",
        "opened": "opened",
        "replied": "replied",
        "failed": "failed",
        "sent": "sent",
    }
    status = status_map.get(event, event)
    return outreach_logger.update_delivery_status(log_id, status, error)