"""Unit tests for the normalizer module."""

import pytest
from datetime import datetime, timezone
from app.normalizer import (
    parse_date,
    extract_salary,
    normalize_location,
    infer_experience_level,
    infer_remote,
    normalize,
)
from app.adapters.base import RawJobListing


class TestParseDate:
    def test_iso_format(self):
        """ISO 8601 date parsing."""
        result = parse_date("2024-03-15")
        assert result is not None
        assert result.year == 2024
        assert result.month == 3
        assert result.day == 15

    def test_month_name_format(self):
        """'Mar 15, 2024' format."""
        result = parse_date("Mar 15, 2024")
        assert result is not None
        assert result.year == 2024
        assert result.month == 3
        assert result.day == 15

    def test_full_month_format(self):
        """'March 15, 2024' format."""
        result = parse_date("March 15, 2024")
        assert result is not None
        assert result.year == 2024
        assert result.month == 3
        assert result.day == 15

    def test_day_month_year_format(self):
        """'15 Mar 2024' format."""
        result = parse_date("15 Mar 2024")
        assert result is not None
        assert result.year == 2024
        assert result.month == 3
        assert result.day == 15

    def test_days_ago_format(self):
        """'3 days ago' format."""
        result = parse_date("3 days ago")
        assert result is not None
        # Should be 3 days before today
        today = datetime.now(timezone.utc)
        diff = today - result
        assert 2 <= diff.days <= 4  # allow for timezone edge cases

    def test_weeks_ago_format(self):
        """'2 weeks ago' format."""
        result = parse_date("2 weeks ago")
        assert result is not None
        today = datetime.now(timezone.utc)
        diff = today - result
        assert 13 <= diff.days <= 15

    def test_today_format(self):
        result = parse_date("Today")
        assert result is not None
        now = datetime.now(timezone.utc)
        assert result.year == now.year
        assert result.month == now.month
        assert result.day == now.day

    def test_yesterday_format(self):
        result = parse_date("Yesterday")
        assert result is not None
        now = datetime.now(timezone.utc)
        assert result.day in (now.day - 1, now.day)  # handle month boundary

    def test_just_posted(self):
        result = parse_date("Just posted")
        assert result is not None

    def test_none_input(self):
        assert parse_date(None) is None

    def test_empty_string(self):
        assert parse_date("") is None


class TestExtractSalary:
    def test_usd_k_range(self):
        result = extract_salary("$150k - $200k")
        assert result is not None
        assert "150k" in result
        assert "200k" in result

    def test_usd_commas(self):
        result = extract_salary("$100,000 - $150,000")
        assert result is not None
        assert "100,000" in result

    def test_inr_lpa(self):
        result = extract_salary("₹25L - ₹40L")
        assert result is not None
        assert "25L" in result

    def test_negotiable(self):
        result = extract_salary("Negotiable")
        assert result is not None
        assert "Negotiable" in result

    def test_none_input(self):
        assert extract_salary(None) is None


class TestNormalizeLocation:
    def test_remote_normalization(self):
        assert normalize_location("Remote / Anywhere") == "Remote"
        assert normalize_location("Work from home") == "Remote"
        assert normalize_location("100% Remote") == "Remote"

    def test_city_kept(self):
        assert normalize_location("San Francisco, CA") == "San Francisco, CA"
        assert normalize_location("Bangalore, India") == "Bangalore, India"


class TestInferExperienceLevel:
    def test_senior_title(self):
        assert infer_experience_level("Senior Software Engineer") == "senior"

    def test_junior_title(self):
        assert infer_experience_level("Junior Developer") == "entry"

    def test_default_to_mid(self):
        assert infer_experience_level("Software Engineer") == "mid"

    def test_none_input(self):
        assert infer_experience_level(None) is None


class TestNormalize:
    def test_full_normalization(self):
        """Verify full normalization of a raw listing."""
        raw = RawJobListing(
            source="remoteok",
            source_id="test-001",
            title="  Senior Software Engineer  ",
            company="  TechCorp  ",
            location="Remote",
            description="We build great software.",
            description_html="<p>We build great software.</p>",
            salary_range="$150k - $200k",
            job_type="full-time",
            remote=True,
            experience_level="senior",
            posted_date="2024-03-15",
            url="https://example.com/job",
            raw_data={"id": "test-001"},
        )
        result = normalize(raw)
        assert result["title"] == "Senior Software Engineer"
        assert result["company"] == "TechCorp"
        assert result["location"] == "Remote"
        assert result["remote"] is True
        assert result["salary_range"] is not None
        assert result["posted_date"] is not None

    def test_empty_strings_handled(self):
        """Verify empty strings in required fields don't crash."""
        raw = RawJobListing(
            source="test",
            source_id="test-002",
            title="Engineer",
            company="Co",
            description="",
            description_html="",
            raw_data={},
        )
        result = normalize(raw)
        assert result["title"] == "Engineer"
        assert result["company"] == "Co"
        assert result["description"] == ""