"""Unit tests for the filter module."""

import pytest
from datetime import datetime, timezone, timedelta
from app.filter import (
    keyword_score,
    passes_location_filter,
    passes_remote_filter,
    passes_experience_filter,
    passes_date_filter,
    filter_jobs,
)


SAMPLE_JOBS = [
    {
        "title": "Senior Software Engineer",
        "company": "TechCorp",
        "description": "Building scalable microservices with Python and Go.",
        "location": "San Francisco, CA",
        "remote": False,
        "experience_level": "senior",
        "posted_date": datetime.now(timezone.utc) - timedelta(days=2),
    },
    {
        "title": "Data Scientist",
        "company": "DataFlow AI",
        "description": "ML and deep learning with Python and TensorFlow.",
        "location": "Remote",
        "remote": True,
        "experience_level": "mid",
        "posted_date": datetime.now(timezone.utc) - timedelta(days=5),
    },
    {
        "title": "React Developer",
        "company": "WebStudio",
        "description": "Frontend developer with React expertise.",
        "location": "Bangalore, India",
        "remote": True,
        "experience_level": "entry",
        "posted_date": datetime.now(timezone.utc) - timedelta(days=30),
    },
]


class TestKeywordScore:
    def test_full_match(self):
        score = keyword_score(SAMPLE_JOBS[0], ["software", "engineer"])
        assert score == 1.0

    def test_partial_match(self):
        score = keyword_score(SAMPLE_JOBS[0], ["software", "engineer", "data"])
        assert 0 < score < 1.0

    def test_no_match(self):
        score = keyword_score(SAMPLE_JOBS[2], ["machine", "learning"])
        assert score == 0.0

    def test_empty_keywords(self):
        score = keyword_score(SAMPLE_JOBS[0], [])
        assert score == 1.0


class TestLocationFilter:
    def test_no_filter_passes(self):
        assert passes_location_filter(SAMPLE_JOBS[0], None) is True

    def test_matching_location(self):
        assert passes_location_filter(SAMPLE_JOBS[0], "San Francisco") is True

    def test_non_matching_location(self):
        assert passes_location_filter(SAMPLE_JOBS[0], "New York") is False

    def test_remote_job_passes_any_location(self):
        assert passes_location_filter(SAMPLE_JOBS[1], "Anywhere") is True


class TestRemoteFilter:
    def test_remote_only_passes_remote_job(self):
        assert passes_remote_filter(SAMPLE_JOBS[1], True) is True

    def test_remote_only_rejects_onsite_job(self):
        assert passes_remote_filter(SAMPLE_JOBS[0], True) is False

    def test_remote_filter_off(self):
        assert passes_remote_filter(SAMPLE_JOBS[0], False) is True


class TestExperienceFilter:
    def test_no_filter_passes(self):
        assert passes_experience_filter(SAMPLE_JOBS[0], None) is True

    def test_exact_match(self):
        assert passes_experience_filter(SAMPLE_JOBS[0], "senior") is True

    def test_senior_matches_senior_too(self):
        # senior filter should accept lead as well (since lead >= senior)
        job = dict(SAMPLE_JOBS[0], experience_level="lead")
        assert passes_experience_filter(job, "senior") is True

    def test_senior_rejects_mid(self):
        assert passes_experience_filter(SAMPLE_JOBS[1], "senior") is False


class TestDateFilter:
    def test_no_filter_passes(self):
        assert passes_date_filter(SAMPLE_JOBS[0], None) is True

    def test_within_range_passes(self):
        assert passes_date_filter(SAMPLE_JOBS[0], 7) is True

    def test_outside_range_fails(self):
        assert passes_date_filter(SAMPLE_JOBS[2], 7) is False


class TestFilterJobs:
    def test_all_pass_no_filters(self):
        results = filter_jobs(SAMPLE_JOBS, ["engineer"])
        assert len(results) == 3

    def test_remote_only_filter(self):
        results = filter_jobs(SAMPLE_JOBS, ["engineer"], remote_only=True)
        assert all(r["remote"] for r in results)
        assert len(results) == 2  # Data Scientist + React Developer

    def test_experience_filter(self):
        results = filter_jobs(SAMPLE_JOBS, ["engineer"], experience_level="senior")
        assert len(results) == 1
        assert results[0]["experience_level"] == "senior"

    def test_location_filter(self):
        results = filter_jobs(SAMPLE_JOBS, ["engineer"], location="Bangalore")
        # Remote jobs pass all location filters, so we get 2: Data Scientist (Remote) + React Developer (Bangalore)
        assert len(results) == 2
        assert any("Bangalore" in r["location"] for r in results)

    def test_date_filter(self):
        results = filter_jobs(SAMPLE_JOBS, ["engineer"], date_posted=3)
        assert len(results) >= 1

    def test_results_sorted_by_score(self):
        results = filter_jobs(SAMPLE_JOBS, ["software", "engineer", "python"])
        if len(results) >= 2:
            assert results[0]["_score"] >= results[1]["_score"]

    def test_empty_jobs_list(self):
        assert filter_jobs([], ["engineer"]) == []