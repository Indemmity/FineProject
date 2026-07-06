"""
SQLAlchemy models for the shared Python package.

Mirrors the Drizzle schema in ``packages/shared/db/schema.ts``.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Text, Integer, Boolean, DateTime, JSON, ForeignKey, UniqueConstraint, Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, nullable=False, unique=True)
    name = Column(String, nullable=False, default="")
    preferences = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))


class Job(Base):
    __tablename__ = "jobs"
    __table_args__ = (
        UniqueConstraint("source", "source_id", name="uq_job_source"),
        Index("idx_jobs_source", "source"),
        Index("idx_jobs_posted_date", "posted_date"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
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
    scraped_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    raw = Column(JSON, nullable=False, default=dict)


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    original_file_path = Column(String, nullable=False)
    parsed_text = Column(Text, nullable=False, default="")
    tailored_text = Column(JSON, nullable=False, default=dict)
    match_score = Column(Integer, nullable=True)
    gap_analysis = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", backref="resumes")


class Application(Base):
    __tablename__ = "applications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    resume_id = Column(UUID(as_uuid=True), ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True)
    status = Column(String, nullable=False, default="discovered")
    match_score = Column(Integer, nullable=True)
    gap_analysis = Column(JSON, nullable=True)
    tailored_resume_text = Column(Text, nullable=True)
    cover_letter_text = Column(Text, nullable=True)
    applied_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=False, default="")

    user = relationship("User", backref="applications")
    job = relationship("Job", backref="applications")
    resume = relationship("Resume", backref="applications")


class TimelineEvent(Base):
    __tablename__ = "timeline_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id = Column(UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    event = Column(String, nullable=False)
    detail = Column(Text, nullable=False, default="")
    source = Column(String, nullable=False, default="system")
    timestamp = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    application = relationship("Application", backref="timeline_events")


class OutreachLog(Base):
    __tablename__ = "outreach_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id = Column(UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, nullable=False, default="draft")
    recipient_email = Column(String, nullable=False)
    recipient_name = Column(String, nullable=False, default="")
    subject = Column(Text, nullable=False, default="")
    body_html = Column(Text, nullable=False, default="")
    body_text = Column(Text, nullable=False, default="")
    sent_at = Column(DateTime(timezone=True), nullable=True)
    delivery_status = Column(String, nullable=False, default="pending")
    opened_at = Column(DateTime(timezone=True), nullable=True)
    replied_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    attachments = Column(JSON, nullable=False, default=list)

    application = relationship("Application", backref="outreach_logs")