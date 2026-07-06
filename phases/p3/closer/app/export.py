"""CSV export of outreach logs."""

from .logger import outreach_logger


def export_logs(user_id: str, fmt: str = "csv") -> str:
    """Export outreach logs for a user.

    Args:
        user_id: The user to export logs for
        fmt: Export format ("csv" only for now)

    Returns:
        Formatted string of log data
    """
    if fmt == "csv":
        return outreach_logger.export_csv(user_id)
    raise ValueError(f"Unsupported export format: {fmt}")