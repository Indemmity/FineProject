"""REST API routes for email outreach."""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query

from ..email_generator import generate_email
from ..email_sender import send_email
from ..preview import render_preview
from ..rate_limiter import rate_limiter
from ..queue import email_queue, QueuedEmail
from ..logger import outreach_logger
from ..export import export_logs
from ..delivery_tracker import track_delivery
from ..config import settings

router = APIRouter()


@router.post("/generate")
async def generate_outreach(
    application_id: str,
    job: dict | None = None,
    application: dict | None = None,
    recipient_name: str = "",
    recipient_email: str = "",
    template_type: str = "cold",
    company_name: str = "",
    job_title: str = "",
):
    """Generate an email draft for a given application."""
    try:
        email = generate_email(
            template_type=template_type,
            job=job,
            application=application,
            recipient_name=recipient_name,
            recipient_email=recipient_email,
        )
        # Extract company/job info from params (fall back to dict if not passed directly)
        if not company_name:
            company_name = (job or {}).get("company", "") or (application or {}).get("company", "")
        if not job_title:
            job_title = (job or {}).get("title", "") or (application or {}).get("role", "") or ""
        # Log the draft
        log_id = outreach_logger.log_send(
            application_id=application_id,
            user_id="demo-user",
            recipient_email=recipient_email,
            recipient_name=recipient_name,
            subject=email["subject"],
            status="draft",
            body_html=email["body_html"],
            body_text=email["body_text"],
            company_name=company_name,
            job_title=job_title,
        )
        # Inject tracking pixel into HTML body
        pixel_url = f"{settings.base_url}/api/outreach/{log_id}/track-open"
        tracked_html = email["body_html"] + (
            f'<img src="{pixel_url}" width="1" height="1" alt="" style="display:none;" />'
        )
        # Update stored body_html to include tracking pixel
        outreach_logger.update_log_status(
            log_id, status="draft", extras={"body_html": tracked_html}
        )
        return {
            "draft": {
                "id": log_id,
                "subject": email["subject"],
                "body_html": tracked_html,
                "body_text": email["body_text"],
            },
            "applicationId": application_id,
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{outreach_id}/preview")
async def preview_outreach(outreach_id: str):
    """Preview a generated email."""
    # In production, fetch the email from DB by ID
    preview = render_preview()
    return preview


@router.post("/{outreach_id}/send")
async def send_outreach(
    outreach_id: str,
    user_id: str = "demo-user",
    subject: str = "",
    body_html: str = "",
    body_text: str = "",
    to_email: str = "",
    to_name: str = "",
    application_id: str = "",
):
    """Send an email. Respects dry-run, rate limits, and queuing."""
    # If body content not provided, try to look it up from the stored log
    log_entry = outreach_logger.get_log_entry(outreach_id)
    if log_entry:
        if log_entry.get("body_html"):
            body_html = body_html or log_entry["body_html"]
        if log_entry.get("body_text"):
            body_text = body_text or log_entry["body_text"]
        if log_entry.get("recipient_email"):
            to_email = to_email or log_entry["recipient_email"]
        if log_entry.get("recipient_name"):
            to_name = to_name or log_entry["recipient_name"]
        if log_entry.get("subject"):
            subject = subject or log_entry["subject"]
        if log_entry.get("application_id"):
            application_id = application_id or log_entry["application_id"]

    # Rate limit check
    allowed, retry_after = rate_limiter.check(user_id)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Retry after {retry_after}s",
            headers={"Retry-After": str(retry_after)},
        )

    # Check dry-run mode
    if settings.dry_run or settings.send_mode == "draft":
        outreach_logger.update_log_status(
            outreach_id,
            status="draft",
            extras={
                "recipient_email": to_email,
                "recipient_name": to_name,
                "subject": subject,
                "body_html": body_html,
                "body_text": body_text,
            },
        )
        return {
            "status": "draft",
            "message": "Draft updated (dry-run mode)",
            "logId": outreach_id,
        }

    # Send via SMTP
    result = send_email(
        to_email=to_email,
        to_name=to_name,
        subject=subject,
        body_html=body_html,
        body_text=body_text,
    )

    if not result.success:
        return {"status": "failed", "error": result.error}

    # Update the original draft's status to sent (keeps same ID)
    outreach_logger.update_log_status(
        outreach_id,
        status="sent",
        extras={
            "recipient_email": to_email,
            "recipient_name": to_name,
            "subject": subject,
            "body_html": body_html,
            "body_text": body_text,
        },
    )

    return {
        "status": "sent",
        "messageId": result.message_id,
        "logId": outreach_id,
        "sentAt": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/{outreach_id}/queue")
async def queue_outreach(
    outreach_id: str,
    to_email: str = "",
    to_name: str = "",
    subject: str = "",
    body_html: str = "",
    body_text: str = "",
):
    """Queue an email for delayed sending."""
    email = QueuedEmail(
        id=outreach_id,
        to_email=to_email,
        to_name=to_name,
        subject=subject,
        body_html=body_html,
        body_text=body_text,
    )
    email_queue.enqueue(email)
    return {"status": "queued", "position": email_queue.size()}


@router.get("/logs")
async def get_logs(
    user_id: str = "demo-user",
    status: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Get outreach logs for a user."""
    logs = outreach_logger.get_logs(
        user_id=user_id, status=status, limit=limit, offset=offset
    )
    return {"logs": logs, "total": len(logs)}


@router.get("/stats")
async def get_stats(user_id: str = "demo-user"):
    """Get aggregated outreach stats."""
    stats = outreach_logger.get_stats(user_id)
    remaining = rate_limiter.remaining(user_id)
    return {**stats, **remaining}


@router.post("/{outreach_id}/track")
async def track_event(outreach_id: str, event: str, error: str | None = None):
    """Track a delivery event (bounce, open, reply, etc.)."""
    success = track_delivery(outreach_id, event, error)
    if not success:
        raise HTTPException(status_code=404, detail="Log entry not found")
    return {"status": "tracked", "event": event}


@router.get("/{outreach_id}/track-open")
async def track_open_pixel(outreach_id: str):
    """Tracking pixel endpoint — logs 'opened' event and returns a 1×1 transparent GIF."""
    track_delivery(outreach_id, "opened")
    # 1×1 transparent GIF
    gif = (
        b"GIF89a\x01\x00\x01\x00\x80\x00\x00"
        b"\xff\xff\xff\x00\x00\x00!\xf9\x04\x00"
        b"\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00"
        b"\x01\x00\x00\x02\x02D\x01\x00;"
    )
    from fastapi.responses import Response
    return Response(content=gif, media_type="image/gif")


@router.post("/{outreach_id}/cancel")
async def cancel_outreach(outreach_id: str):
    """Cancel / remove a draft from the queue."""
    success = outreach_logger.update_log_status(outreach_id, status="cancelled")
    if not success:
        raise HTTPException(status_code=404, detail="Log entry not found")
    return {"status": "cancelled", "logId": outreach_id}


@router.get("/export")
async def export_logs_csv(user_id: str = "demo-user"):
    """Export outreach logs as CSV."""
    csv = export_logs(user_id)
    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(
        content=csv,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=outreach_logs.csv"},
    )