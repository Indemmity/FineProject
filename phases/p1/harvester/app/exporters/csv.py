"""CSV exporter — writes job listings to CSV format."""

import csv
import io
from typing import Any


CSV_HEADERS = [
    "id", "source", "source_id", "title", "company", "location",
    "description", "salary_range", "job_type", "remote",
    "experience_level", "posted_date", "url", "search_keyword",
    "scraped_at",
]


def export_to_csv(jobs: list[dict[str, Any]]) -> str:
    """Export jobs to a CSV string."""
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=CSV_HEADERS, extrasaction="ignore")
    writer.writeheader()
    for job in jobs:
        row = {
            "id": job.get("id", ""),
            "source": job.get("source", ""),
            "source_id": job.get("source_id", ""),
            "title": job.get("title", ""),
            "company": job.get("company", ""),
            "location": job.get("location", ""),
            "description": job.get("description", ""),
            "salary_range": job.get("salary_range", ""),
            "job_type": job.get("job_type", ""),
            "remote": str(job.get("remote", False)),
            "experience_level": job.get("experience_level", ""),
            "posted_date": job.get("posted_date", ""),
            "url": job.get("url", ""),
            "search_keyword": job.get("search_keyword", ""),
            "scraped_at": job.get("scraped_at", ""),
        }
        writer.writerow(row)
    return output.getvalue()


def export_to_file(jobs: list[dict[str, Any]], filepath: str) -> str:
    """Export jobs to a CSV file. Returns the filepath."""
    content = export_to_csv(jobs)
    with open(filepath, "w", encoding="utf-8", newline="") as f:
        f.write(content)
    return filepath