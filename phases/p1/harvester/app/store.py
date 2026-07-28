"""
Job store — CRUD operations for the jobs table with async SQLAlchemy.

Handles:
- Batch insert with upsert (conflict on source + source_id)
- Read by ID, source, keyword
- Delete by ID
- Search with pagination
"""

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import select, delete as sa_delete, func, and_
from sqlalchemy.dialects.postgresql import insert as pg_insert

from .models import get_session, JobModel


async def upsert_jobs(jobs: list[dict[str, Any]]) -> int:
    """Insert or update jobs. Returns count of inserted rows."""
    if not jobs:
        return 0

    now = datetime.now(timezone.utc)
    async with get_session() as session:
        for job in jobs:
            stmt = pg_insert(JobModel).values(
                source=job["source"],
                source_id=job["source_id"],
                title=job.get("title", ""),
                company=job.get("company", ""),
                location=job.get("location"),
                description=job.get("description", ""),
                description_html=job.get("description_html", ""),
                salary_range=job.get("salary_range"),
                job_type=job.get("job_type"),
                remote=job.get("remote", False),
                experience_level=job.get("experience_level"),
                posted_date=job.get("posted_date"),
                url=job.get("url", ""),
                search_keyword=job.get("search_keyword", ""),
                scraped_at=job.get("scraped_at", now),
                raw=job.get("raw", {}),
            )
            stmt = stmt.on_conflict_do_update(
                constraint="uq_job_source",
                set_={
                    "title": stmt.excluded.title,
                    "company": stmt.excluded.company,
                    "location": stmt.excluded.location,
                    "description": stmt.excluded.description,
                    "description_html": stmt.excluded.description_html,
                    "salary_range": stmt.excluded.salary_range,
                    "job_type": stmt.excluded.job_type,
                    "remote": stmt.excluded.remote,
                    "experience_level": stmt.excluded.experience_level,
                    "posted_date": stmt.excluded.posted_date,
                    "url": stmt.excluded.url,
                    "search_keyword": stmt.excluded.search_keyword,
                    "scraped_at": stmt.excluded.scraped_at,
                    "raw": stmt.excluded.raw,
                },
            )
            await session.execute(stmt)
        await session.commit()
        return len(jobs)


async def get_job(job_id: str) -> dict[str, Any] | None:
    """Get a single job by ID."""
    async with get_session() as session:
        try:
            uid = UUID(job_id)
        except ValueError:
            return None
        result = await session.execute(select(JobModel).where(JobModel.id == uid))
        job = result.scalar_one_or_none()
        if job is None:
            return None
        return _job_to_dict(job)


async def list_jobs(
    source: str | None = None,
    keyword: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """List jobs with optional filtering and pagination."""
    async with get_session() as session:
        query = select(JobModel).order_by(JobModel.scraped_at.desc())

        conditions = []
        if source:
            conditions.append(JobModel.source == source)
        if keyword:
            conditions.append(JobModel.search_keyword.ilike(f"%{keyword}%"))

        if conditions:
            query = query.where(and_(*conditions))

        query = query.offset(offset).limit(limit)
        result = await session.execute(query)
        jobs = result.scalars().all()
        return [_job_to_dict(j) for j in jobs]


async def search_jobs(
    keywords: list[str],
    source: str | None = None,
    limit: int = 500,
) -> list[dict[str, Any]]:
    """Search jobs by keywords in title/company/description."""
    async with get_session() as session:
        conditions = []
        for kw in keywords:
            kw_pattern = f"%{kw}%"
            conditions.append(
                JobModel.title.ilike(kw_pattern)
                | JobModel.company.ilike(kw_pattern)
                | JobModel.description.ilike(kw_pattern)
            )

        query = select(JobModel).where(and_(*conditions))
        if source:
            query = query.where(JobModel.source == source)
        query = query.order_by(JobModel.scraped_at.desc()).limit(limit)

        result = await session.execute(query)
        jobs = result.scalars().all()
        return [_job_to_dict(j) for j in jobs]


async def delete_job(job_id: str) -> bool:
    """Delete a job by ID. Returns True if deleted."""
    async with get_session() as session:
        try:
            uid = UUID(job_id)
        except ValueError:
            return False
        result = await session.execute(sa_delete(JobModel).where(JobModel.id == uid))
        await session.commit()
        return result.rowcount > 0


async def count_jobs(source: str | None = None) -> int:
    """Count jobs, optionally filtered by source."""
    async with get_session() as session:
        query = select(func.count(JobModel.id))
        if source:
            query = query.where(JobModel.source == source)
        result = await session.execute(query)
        return result.scalar() or 0


async def get_sources_summary() -> list[dict[str, Any]]:
    """Get summary of available sources with counts and last scraped times."""
    async with get_session() as session:
        sources = ["naukri", "remoteok", "wellfound", "indeed", "timesjobs", "monster"]
        summaries = []
        for source in sources:
            query = select(
                func.count(JobModel.id),
                func.max(JobModel.scraped_at),
            ).where(JobModel.source == source)
            result = await session.execute(query)
            count, last_scraped = result.one()
            summaries.append({
                "name": source,
                "enabled": True,
                "count": count,
                "last_scraped": last_scraped,
            })
        return summaries


def _job_to_dict(job: JobModel) -> dict[str, Any]:
    """Convert a JobModel ORM instance to a dict."""
    return {
        "id": str(job.id),
        "source": job.source,
        "source_id": job.source_id,
        "title": job.title,
        "company": job.company,
        "location": job.location,
        "description": job.description,
        "description_html": job.description_html,
        "salary_range": job.salary_range,
        "job_type": job.job_type,
        "remote": job.remote,
        "experience_level": job.experience_level,
        "posted_date": job.posted_date,
        "url": job.url,
        "search_keyword": job.search_keyword,
        "scraped_at": job.scraped_at,
        "raw": job.raw,
    }
