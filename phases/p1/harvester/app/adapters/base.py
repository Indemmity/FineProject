from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class SearchParams:
    keywords: list[str]
    location: str | None = None
    remote_only: bool = False
    experience_level: str | None = None
    date_posted: int | None = None


@dataclass
class RawJobListing:
    source: str
    source_id: str
    title: str
    company: str
    location: str | None = None
    description: str = ""
    description_html: str = ""
    salary_range: str | None = None
    job_type: str | None = None
    remote: bool = False
    experience_level: str | None = None
    posted_date: str | None = None
    url: str = ""
    raw_data: dict[str, Any] = field(default_factory=dict)


class JobSourceAdapter(ABC):
    """Base class for job source adapters."""

    @property
    @abstractmethod
    def source_name(self) -> str:
        """Unique identifier for this source."""
        ...

    @abstractmethod
    async def search(self, params: SearchParams) -> list[RawJobListing]:
        """Fetch job listings from the source based on search params."""
        ...

    @abstractmethod
    async def normalize(self, raw: RawJobListing) -> dict[str, Any]:
        """Convert a raw listing into the shared NormalizedJob format."""
        ...