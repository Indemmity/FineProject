"""Unit tests for the dedup module."""

import pytest
from app.dedup import is_duplicate, deduplicate


class TestIsDuplicate:
    def test_exact_url_match(self):
        existing = {"url": "https://example.com/job/123"}
        candidate = {"url": "https://example.com/job/123"}
        assert is_duplicate(existing, candidate) is True

    def test_different_urls(self):
        existing = {"url": "https://example.com/job/123", "title": "Engineer", "company": "Co"}
        candidate = {"url": "https://example.com/job/456", "title": "Engineer", "company": "Co"}
        assert is_duplicate(existing, candidate) is True  # same title+company

    def test_same_source_id(self):
        existing = {"source": "remoteok", "source_id": "abc123"}
        candidate = {"source": "remoteok", "source_id": "abc123"}
        assert is_duplicate(existing, candidate) is True

    def test_different_jobs(self):
        existing = {"title": "Software Engineer", "company": "Google"}
        candidate = {"title": "Data Scientist", "company": "Facebook"}
        assert is_duplicate(existing, candidate) is False

    def test_similar_titles_same_company(self):
        existing = {"title": "Senior Software Engineer", "company": "Google"}
        candidate = {"title": "Software Engineer", "company": "Google"}
        assert is_duplicate(existing, candidate) is True

    def test_same_title_different_company(self):
        existing = {"title": "Software Engineer", "company": "Google"}
        candidate = {"title": "Software Engineer", "company": "Facebook"}
        assert is_duplicate(existing, candidate) is False

    def test_slightly_different_titles_same_company(self):
        existing = {"title": "Sr. Software Engineer", "company": "Amazon"}
        candidate = {"title": "Senior Software Engineer", "company": "Amazon"}
        assert is_duplicate(existing, candidate) is True

    def test_empty_title(self):
        existing = {"title": "", "company": "Co"}
        candidate = {"title": "Engineer", "company": "Co"}
        assert is_duplicate(existing, candidate) is False

    def test_case_insensitive(self):
        existing = {"title": "Software ENGINEER", "company": "Google Inc"}
        candidate = {"title": "Software Engineer", "company": "Google inc"}
        assert is_duplicate(existing, candidate) is True


class TestDeduplicate:
    def test_no_duplicates(self):
        candidates = [
            {"title": "Engineer A", "company": "Co A"},
            {"title": "Engineer B", "company": "Co B"},
            {"title": "Engineer C", "company": "Co C"},
        ]
        result = deduplicate(candidates)
        assert len(result) == 3

    def test_exact_duplicates_removed(self):
        candidates = [
            {"title": "Software Engineer", "company": "Google"},
            {"title": "Software Engineer", "company": "Google"},
            {"title": "Software Engineer", "company": "Google"},
        ]
        result = deduplicate(candidates)
        assert len(result) == 1

    def test_fuzzy_duplicates_removed(self):
        candidates = [
            {"title": "Senior Software Engineer", "company": "Google"},
            {"title": "Sr. Software Engineer", "company": "Google"},
            {"title": "Software Engineer", "company": "Facebook"},
        ]
        result = deduplicate(candidates)
        assert len(result) == 2  # first two are duplicates

    def test_deduplicate_against_existing(self):
        existing = [
            {"title": "Software Engineer", "company": "Google"},
        ]
        candidates = [
            {"title": "Software Engineer", "company": "Google"},
            {"title": "Data Scientist", "company": "Facebook"},
        ]
        result = deduplicate(candidates, existing)
        assert len(result) == 1
        assert result[0]["title"] == "Data Scientist"

    def test_empty_candidates(self):
        assert deduplicate([]) == []