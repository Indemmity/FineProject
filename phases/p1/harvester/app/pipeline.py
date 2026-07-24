"""
Pipeline orchestrator — coordinates the full job harvesting pipeline.

Flow:
  receive search params → run all source adapters → normalize →
  merge → filter → dedup → store → return results
"""

import asyncio
import uuid
from datetime import datetime, timezone
from typing import Any

from .adapters import get_adapter, list_adapters, SearchParams
from .normalizer import normalize
from .filter import filter_jobs
from .dedup import deduplicate
from .store import upsert_jobs, search_jobs, get_sources_summary


# In-memory search state (in production, use Redis)
_search_state: dict[str, dict[str, Any]] = {}


async def run_pipeline(
    keywords: list[str],
    location: str | None = None,
    remote_only: bool = False,
    experience_level: str | None = None,
    date_posted: int | None = None,
    sources: list[str] | None = None,
) -> dict[str, Any]:
    """
    Run the full job harvesting pipeline.

    Returns:
        dict with search_id, status, results, and metadata
    """
    search_id = str(uuid.uuid4())
    _search_state[search_id] = {
        "status": "processing",
        "progress": 0,
        "results": [],
        "error": None,
    }

    try:
        params = SearchParams(
            keywords=keywords,
            location=location,
            remote_only=remote_only,
            experience_level=experience_level,
            date_posted=date_posted,
        )

        # Get adapters
        adapter_names = sources or list_adapters()
        adapters = []
        for name in adapter_names:
            try:
                adapter = get_adapter(name)
                adapters.append(adapter)
            except ValueError:
                continue

        if not adapters:
            _search_state[search_id] = {
                "status": "failed",
                "progress": 0,
                "results": [],
                "error": "No valid source adapters found",
            }
            return _search_state[search_id]

        # Phase 1: Fetch from all sources in parallel
        _search_state[search_id]["progress"] = 10
        raw_results: list[dict[str, Any]] = []
        tasks = []
        for adapter in adapters:
            tasks.append(_fetch_source(adapter, params))

        batch_results = await asyncio.gather(*tasks, return_exceptions=True)
        for i, result in enumerate(batch_results):
            if isinstance(result, Exception):
                print(f"Source {adapter_names[i] if i < len(adapter_names) else 'unknown'} failed: {result}")
                continue
            raw_results.extend(result)

        _search_state[search_id]["progress"] = 40

        # Phase 2: Normalize all results
        normalized = []
        for raw in raw_results:
            try:
                job_dict = normalize(raw)
                job_dict["search_keyword"] = ", ".join(keywords)
                job_dict["scraped_at"] = datetime.now(timezone.utc)
                normalized.append(job_dict)
            except Exception as e:
                print(f"Normalisation failed for {raw.source}/{raw.source_id}: {e}")
                continue

        _search_state[search_id]["progress"] = 60

        # Phase 3: Filter
        filtered = filter_jobs(
            normalized,
            keywords=keywords,
            location=location,
            remote_only=remote_only,
            experience_level=experience_level,
            date_posted=date_posted,
            min_score=0.1,
        )

        _search_state[search_id]["progress"] = 75

        # Phase 4: Deduplicate against existing DB records
        existing = await search_jobs(keywords, limit=500)
        unique = deduplicate(filtered, existing)

        _search_state[search_id]["progress"] = 85

        # Phase 5: Store in database
        inserted_count = await upsert_jobs(unique)
        
        # Filter results by source if specific sources were requested
        if sources:
            # Filter stored results to only include requested sources
            stored = [job for job in await search_jobs(keywords, limit=500) if job.get("source") in sources]
        else:
            stored = await search_jobs(keywords, limit=500)

        _search_state[search_id]["progress"] = 100
        _search_state[search_id]["status"] = "completed"
        _search_state[search_id]["results"] = stored
        _search_state[search_id]["metadata"] = {
            "total_fetched": len(raw_results),
            "normalized": len(normalized),
            "after_filter": len(filtered),
            "after_dedup": len(unique),
            "inserted": inserted_count,
        }

    except Exception as e:
        _search_state[search_id] = {
            "status": "failed",
            "progress": 0,
            "results": [],
            "error": str(e),
        }

    return _search_state[search_id]


async def _fetch_source(
    adapter: Any,
    params: SearchParams,
) -> list[Any]:
    """Fetch jobs from a single source adapter."""
    raw_listings = await adapter.search(params)
    return raw_listings


def get_search_state(search_id: str) -> dict[str, Any] | None:
    """Get the current state of a search."""
    return _search_state.get(search_id)


def cleanup_old_searches(max_age_hours: int = 24) -> int:
    """Remove search states older than max_age_hours."""
    now = datetime.now(timezone.utc)
    expired = []
    for sid, state in _search_state.items():
        # No timestamp tracking in simple state; skip for now
        pass
    return 0
