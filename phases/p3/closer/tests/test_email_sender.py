"""Unit tests for the SMTP sender and rate limiter."""

import pytest
from app.email_sender import send_email
from app.rate_limiter import RateLimiter


class TestRateLimiter:
    def test_allows_first_request(self):
        limiter = RateLimiter(hourly_limit=5, daily_limit=20)
        allowed, retry_after = limiter.check("user-1")
        assert allowed is True
        assert retry_after == 0

    def test_blocks_after_hourly_limit(self):
        limiter = RateLimiter(hourly_limit=2, daily_limit=20)
        for _ in range(2):
            limiter.check("user-2")
        allowed, retry_after = limiter.check("user-2")
        assert allowed is False
        assert retry_after > 0

    def test_daily_limit_respected(self):
        limiter = RateLimiter(hourly_limit=100, daily_limit=3)
        for _ in range(3):
            limiter.check("user-3")
        allowed, _ = limiter.check("user-3")
        assert allowed is False

    def test_different_users_independent(self):
        limiter = RateLimiter(hourly_limit=1, daily_limit=10)
        limiter.check("user-a")
        allowed_a, _ = limiter.check("user-a")
        allowed_b, _ = limiter.check("user-b")
        assert allowed_a is False
        assert allowed_b is True

    def test_remaining_capacity(self):
        limiter = RateLimiter(hourly_limit=10, daily_limit=50)
        limiter.check("user-4")
        remaining = limiter.remaining("user-4")
        assert remaining["hourly_remaining"] == 9
        assert remaining["daily_remaining"] == 49

    def test_reset(self):
        limiter = RateLimiter(hourly_limit=1, daily_limit=5)
        limiter.check("user-5")
        limiter.reset("user-5")
        allowed, _ = limiter.check("user-5")
        assert allowed is True


class TestEmailSender:
    def test_dry_run_returns_success(self, monkeypatch):
        monkeypatch.setattr("app.config.settings.dry_run", True)
        result = send_email(
            to_email="test@example.com",
            to_name="Test User",
            subject="Test",
            body_html="<p>Hi</p>",
            body_text="Hi",
        )
        assert result.success is True
        assert result.message_id != ""

    def test_invalid_email_returns_error(self, monkeypatch):
        monkeypatch.setattr("app.config.settings.dry_run", False)
        monkeypatch.setattr(
            "smtplib.SMTP", lambda *a, **kw: (_ for _ in ()).throw(Exception("SMTP fail"))
        )
        result = send_email(
            to_email="test@example.com",
            to_name="Test",
            subject="Test",
            body_html="<p>Hi</p>",
            body_text="Hi",
        )
        assert result.success is False