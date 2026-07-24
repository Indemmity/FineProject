"""
Adapter factory — maps source names to adapter classes.

Adding a new source:
1. Create a new file in adapters/ implementing JobSourceAdapter
2. Import and register it in the ADAPTER_REGISTRY below
"""

from typing import Any
from .base import JobSourceAdapter, SearchParams, RawJobListing
from .remoteok import RemoteOKAdapter
from .wellfound import WellfoundAdapter
from .naukri import NaukriAdapter
from .indeed import IndeedAdapter
from .timesjobs import TimesJobsAdapter
from .foundit import FounditAdapter

ADAPTER_REGISTRY: dict[str, type[JobSourceAdapter]] = {
    "remoteok": RemoteOKAdapter,
    "wellfound": WellfoundAdapter,
    "naukri": NaukriAdapter,
    "indeed": IndeedAdapter,
    "timesjobs": TimesJobsAdapter,
    "foundit": FounditAdapter,
}


def get_adapter(source: str) -> JobSourceAdapter:
    """Get an adapter instance for the given source name."""
    cls = ADAPTER_REGISTRY.get(source)
    if cls is None:
        raise ValueError(f"Unknown source: {source}. Available: {', '.join(ADAPTER_REGISTRY)}")
    return cls()


def list_adapters() -> list[str]:
    """List all registered adapter names."""
    return list(ADAPTER_REGISTRY.keys())