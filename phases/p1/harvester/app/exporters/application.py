"""Application exporter — batch-create Application records from selected jobs."""

from typing import Any


async def export_as_applications(
    jobs: list[dict[str, Any]],
    user_id: str,
) -> list[dict[str, Any]]:
    """Create Application records from selected job listings.

    This function creates application records in the database.
    In the current implementation, it returns the application data
    that can be inserted via the applications API.

    Args:
        jobs: List of job dicts (must include 'id')
        user_id: The user creating the applications

    Returns:
        List of application dicts ready for insertion
    """
    applications = []
    for job in jobs:
        app = {
            "user_id": user_id,
            "job_id": job.get("id"),
            "status": "discovered",
            "notes": f"Auto-created from {job.get('source', 'unknown')} search",
        }
        applications.append(app)
    return applications