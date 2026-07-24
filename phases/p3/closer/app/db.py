"""SQLite-backed storage for outreach logs."""

import os
import sqlite3
import threading
from pathlib import Path
from typing import Any

DB_PATH = Path(os.environ.get("OUTREACH_DB_PATH", Path(__file__).resolve().parent.parent / "outreach.db"))

_local = threading.local()


def get_connection() -> sqlite3.Connection:
    """Get thread-local SQLite connection."""
    if not hasattr(_local, "conn") or _local.conn is None:
        _local.conn = sqlite3.connect(str(DB_PATH))
        _local.conn.row_factory = sqlite3.Row
        _local.conn.execute("PRAGMA journal_mode=WAL")
        _local.conn.execute("PRAGMA foreign_keys=ON")
    return _local.conn


def init_db():
    """Create tables if they don't exist."""
    conn = get_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS outreach_logs (
            id TEXT PRIMARY KEY,
            application_id TEXT,
            user_id TEXT,
            recipient_email TEXT,
            recipient_name TEXT,
            company_name TEXT,
            job_title TEXT,
            subject TEXT,
            subject_hash TEXT,
            status TEXT,
            delivery_status TEXT,
            error_message TEXT,
            body_html TEXT,
            body_text TEXT,
            sent_at TEXT,
            opened_at TEXT,
            replied_at TEXT
        )
    """)
    conn.commit()


def insert_log(entry: dict[str, Any]):
    """Insert a log entry."""
    conn = get_connection()
    conn.execute(
        """
        INSERT INTO outreach_logs (
            id, application_id, user_id,
            recipient_email, recipient_name, company_name, job_title,
            subject, subject_hash,
            status, delivery_status, error_message,
            body_html, body_text,
            sent_at, opened_at, replied_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            entry["id"],
            entry["application_id"],
            entry["user_id"],
            entry["recipient_email"],
            entry["recipient_name"],
            entry.get("company_name", ""),
            entry.get("job_title", ""),
            entry["subject"],
            entry["subject_hash"],
            entry["status"],
            entry["delivery_status"],
            entry.get("error_message"),
            entry.get("body_html", ""),
            entry.get("body_text", ""),
            entry["sent_at"],
            entry.get("opened_at"),
            entry.get("replied_at"),
        ),
    )
    conn.commit()


def update_log(log_id: str, **kwargs):
    """Update fields on a log entry."""
    if not kwargs:
        return False
    sets = ", ".join(f"{k} = ?" for k in kwargs)
    values = list(kwargs.values()) + [log_id]
    conn = get_connection()
    conn.execute(f"UPDATE outreach_logs SET {sets} WHERE id = ?", values)
    conn.commit()
    return conn.total_changes > 0


def get_log(log_id: str) -> dict[str, Any] | None:
    """Get a single log entry by ID."""
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM outreach_logs WHERE id = ?", (log_id,)
    ).fetchone()
    if row is None:
        return None
    return dict(row)


def get_logs(
    user_id: str,
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """Get logs for a user with optional filtering and pagination."""
    conn = get_connection()
    if status:
        rows = conn.execute(
            "SELECT * FROM outreach_logs WHERE user_id = ? AND status = ? ORDER BY sent_at DESC LIMIT ? OFFSET ?",
            (user_id, status, limit, offset),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM outreach_logs WHERE user_id = ? ORDER BY sent_at DESC LIMIT ? OFFSET ?",
            (user_id, limit, offset),
        ).fetchall()
    return [dict(r) for r in rows]


def get_stats(user_id: str) -> dict[str, Any]:
    """Get aggregated stats for a user."""
    conn = get_connection()
    total = conn.execute(
        "SELECT COUNT(*) FROM outreach_logs WHERE user_id = ?", (user_id,)
    ).fetchone()[0]
    sent = conn.execute(
        "SELECT COUNT(*) FROM outreach_logs WHERE user_id = ? AND status = 'sent'",
        (user_id,),
    ).fetchone()[0]
    opened = conn.execute(
        "SELECT COUNT(*) FROM outreach_logs WHERE user_id = ? AND opened_at IS NOT NULL",
        (user_id,),
    ).fetchone()[0]
    replied = conn.execute(
        "SELECT COUNT(*) FROM outreach_logs WHERE user_id = ? AND replied_at IS NOT NULL",
        (user_id,),
    ).fetchone()[0]
    bounced = conn.execute(
        "SELECT COUNT(*) FROM outreach_logs WHERE user_id = ? AND delivery_status = 'bounced'",
        (user_id,),
    ).fetchone()[0]
    failed = conn.execute(
        "SELECT COUNT(*) FROM outreach_logs WHERE user_id = ? AND status = 'failed'",
        (user_id,),
    ).fetchone()[0]

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


def export_csv(user_id: str) -> str:
    """Export logs as CSV string."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM outreach_logs WHERE user_id = ? ORDER BY sent_at DESC",
        (user_id,),
    ).fetchall()
    headers = [
        "id", "application_id", "recipient_email", "recipient_name",
        "subject", "status", "delivery_status", "sent_at",
        "opened_at", "replied_at", "error_message",
    ]
    lines = [",".join(f'"{h}"' for h in headers)]
    for row in rows:
        d = dict(row)
        row_vals = [str(d.get(h, "")) for h in headers]
        lines.append(",".join(f'"{v}"' for v in row_vals))
    return "\n".join(lines)


# Initialize on import
init_db()
