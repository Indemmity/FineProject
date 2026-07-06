"""REST API routes for job export."""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
import io

from ..store import search_jobs, list_jobs
from ..exporters.csv import export_to_csv

router = APIRouter()


@router.get("/export")
async def export_jobs(
    search_id: str | None = None,
    format: str = Query("csv", pattern=r"^(csv)$"),
    source: str | None = None,
    keyword: str | None = None,
    limit: int = Query(1000, ge=1, le=10000),
):
    """Export job listings as CSV."""
    if keyword:
        keywords = [k.strip() for k in keyword.split(",") if k.strip()]
        jobs = await search_jobs(keywords, source=source, limit=limit)
    else:
        jobs = await list_jobs(source=source, keyword=None, limit=limit)

    if not jobs:
        raise HTTPException(status_code=404, detail="No jobs found matching the criteria")

    csv_content = export_to_csv(jobs)
    filename = f"jobs_export_{len(jobs)}_listings.csv"

    return StreamingResponse(
        io.StringIO(csv_content),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "text/csv; charset=utf-8",
        },
    )