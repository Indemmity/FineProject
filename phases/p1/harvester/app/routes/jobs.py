"""REST API routes for job harvesting."""

from fastapi import APIRouter, HTTPException, Query
from typing import Any

from ..models import (
    JobSearchRequest,
    BatchSearchRequest,
    JobResponse,
    SearchStatusResponse,
    SourceInfo,
    SourcesResponse,
)
from ..pipeline import run_pipeline, get_search_state
from ..store import get_job, list_jobs, delete_job, search_jobs, get_sources_summary

router = APIRouter()


@router.get("/", response_model=dict[str, list[JobResponse]])
async def list_jobs_endpoint(
    source: str | None = None,
    keyword: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """List all harvested jobs with optional filtering."""
    jobs = await list_jobs(source=source, keyword=keyword, limit=limit, offset=offset)
    return {"jobs": [JobResponse(**j) for j in jobs]}


@router.post("/search", response_model=SearchStatusResponse)
async def search_jobs_endpoint(request: JobSearchRequest):
    """Start a new job search across all configured sources."""
    result = await run_pipeline(
        keywords=request.keywords,
        location=request.location,
        remote_only=request.remote_only,
        experience_level=request.experience_level,
        date_posted=request.date_posted,
        sources=request.sources,
    )
    return SearchStatusResponse(
        search_id=result.get("search_id", ""),
        status=result.get("status", "failed"),
        progress=result.get("progress", 0),
        results=[JobResponse(**j) for j in result.get("results", [])],
        error=result.get("error"),
    )


@router.get("/search/{search_id}", response_model=SearchStatusResponse)
async def get_search_status(search_id: str):
    """Poll the status of a running or completed search."""
    state = get_search_state(search_id)
    if state is None:
        raise HTTPException(status_code=404, detail=f"Search {search_id} not found")

    return SearchStatusResponse(
        search_id=search_id,
        status=state.get("status", "unknown"),
        progress=state.get("progress", 0),
        results=[JobResponse(**j) for j in state.get("results", [])],
        error=state.get("error"),
    )


@router.get("/search", response_model=SearchStatusResponse)
async def search_jobs_sync(
    q: str = Query(..., description="Search query (comma-separated keywords)"),
    location: str | None = None,
    remote_only: bool = False,
    experience_level: str | None = None,
    date_posted: int | None = None,
):
    """Quick synchronous search — runs pipeline and returns results directly."""
    keywords = [k.strip() for k in q.split(",") if k.strip()]
    if not keywords:
        raise HTTPException(status_code=422, detail="At least one keyword is required")

    result = await run_pipeline(
        keywords=keywords,
        location=location,
        remote_only=remote_only,
        experience_level=experience_level,
        date_posted=date_posted,
    )
    return SearchStatusResponse(
        search_id=result.get("search_id", ""),
        status=result.get("status", "failed"),
        progress=result.get("progress", 0),
        results=[JobResponse(**j) for j in result.get("results", [])],
        error=result.get("error"),
    )


@router.get("/sources", response_model=SourcesResponse)
async def list_sources():
    """List available job sources with metadata."""
    summaries = await get_sources_summary()
    return SourcesResponse(
        sources=[SourceInfo(**s) for s in summaries]
    )


@router.get("/{job_id}", response_model=JobResponse)
async def get_job_endpoint(job_id: str):
    """Get a single job by ID."""
    job = await get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return JobResponse(**job)


@router.delete("/{job_id}")
async def delete_job_endpoint(job_id: str):
    """Delete a job by ID."""
    deleted = await delete_job(job_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return {"message": f"Job {job_id} deleted"}