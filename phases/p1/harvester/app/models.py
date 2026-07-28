from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field
from sqlalchemy import (
    Column, String, Boolean, DateTime, Text, JSON, UniqueConstraint, Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
import uuid as _uuid


# ─── SQLAlchemy Engine & Session ─────────────────────────────────────────────

engine: Any = None
async_session: async_sessionmaker[AsyncSession] | None = None


async def init_db(database_url: str) -> None:
    global engine, async_session
    engine = create_async_engine(database_url, echo=False, pool_size=5, max_overflow=10)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    global engine
    if engine:
        await engine.dispose()


def get_session() -> AsyncSession:
    if async_session is None:
        raise RuntimeError("Database not initialised. Call init_db() first.")
    return async_session()


# ─── SQLAlchemy Base ─────────────────────────────────────────────────────────

class Base(DeclarativeBase):
    pass


# ─── SQLAlchemy Model ────────────────────────────────────────────────────────

class JobModel(Base):
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid.uuid4)
    source = Column(String, nullable=False)
    source_id = Column(String, nullable=False)
    title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    location = Column(String, nullable=True)
    description = Column(Text, nullable=False, default="")
    description_html = Column(Text, nullable=False, default="")
    salary_range = Column(String, nullable=True)
    job_type = Column(String, nullable=True)
    remote = Column(Boolean, nullable=False, default=False)
    experience_level = Column(String, nullable=True)
    posted_date = Column(DateTime(timezone=True), nullable=True)
    url = Column(String, nullable=False, default="")
    search_keyword = Column(String, nullable=False, default="")
    scraped_at = Column(DateTime(timezone=True), nullable=False)
    raw = Column(JSON, nullable=False, default=dict)

    __table_args__ = (
        UniqueConstraint("source", "source_id", name="uq_job_source"),
        Index("idx_jobs_source", "source"),
        Index("idx_jobs_posted_date", "posted_date"),
    )


# ─── Pydantic Schemas ────────────────────────────────────────────────────────

class JobSearchRequest(BaseModel):
    keywords: list[str] = Field(..., min_length=1, max_length=10)
    location: str | None = None
    remote_only: bool = False
    experience_level: str | None = Field(None, pattern=r"^(entry|mid|senior|lead)$")
    date_posted: int | None = Field(None, ge=1, le=365, description="Days since posted")
    sources: list[str] | None = None


class BatchSearchRequest(BaseModel):
    queries: list[JobSearchRequest] = Field(..., min_length=1, max_length=20)


class JobResponse(BaseModel):
    id: str
    source: str
    source_id: str
    title: str
    company: str
    location: str | None
    description: str
    description_html: str
    salary_range: str | None
    job_type: str | None
    remote: bool
    experience_level: str | None
    posted_date: datetime | None
    url: str
    search_keyword: str
    scraped_at: datetime

    model_config = {"from_attributes": True}


class SearchStatusResponse(BaseModel):
    search_id: str
    status: str  # "pending" | "processing" | "completed" | "failed"
    progress: int = 0  # 0–100
    results: list[JobResponse] = []
    error: str | None = None


class SourceInfo(BaseModel):
    name: str
    enabled: bool
    last_scraped: datetime | None = None


class SourcesResponse(BaseModel):
    sources: list[SourceInfo]


class ExportResponse(BaseModel):
    message: str
    filename: str | None = None
    count: int = 0


class ApiError(BaseModel):
    code: str
    message: str
    retryable: bool = False
    request_id: str = ""