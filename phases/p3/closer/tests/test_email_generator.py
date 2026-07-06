"""Unit tests for the email generator module."""

import pytest
from app.email_generator import generate_email
from app.personalizer import build_context, render_intro, render_body


class TestEmailGenerator:
    def test_cold_email_generation(self):
        result = generate_email(
            template_type="cold",
            job={"title": "Software Engineer", "company": "TechCorp"},
            recipient_name="Jane Doe",
            recipient_email="jane@techcorp.com",
            sender_name="John",
            sender_title="Recruiter",
        )
        assert result["subject"] == "Exploring opportunities at TechCorp"
        assert "TechCorp" in result["body_html"]
        assert "Jane Doe" in result["body_text"]
        assert result["body_html"].startswith("<!DOCTYPE html>")

    def test_follow_up_email(self):
        result = generate_email(
            template_type="follow_up",
            job={"title": "Data Scientist", "company": "DataFlow"},
            recipient_name="Bob",
            recipient_email="bob@dataflow.com",
        )
        assert "Following up" in result["subject"]
        assert "DataFlow" in result["body_html"]

    def test_invalid_template_type(self):
        with pytest.raises(ValueError, match="Unknown template type"):
            generate_email(template_type="invalid")

    def test_personalization(self):
        ctx = build_context(
            job={"title": "Engineer", "company": "Co"},
            recipient_name="Alice",
            recipient_email="alice@co.com",
            sender_name=" recruiter",
        )
        intro = render_intro(ctx)
        assert "recruiter" in intro
        assert "Engineer" in intro
        assert "Co" in intro

    def test_body_generation(self):
        ctx = build_context(
            job={"title": "Senior Developer", "company": "Startup Inc",
                 "description": "Full-stack role with React and Python"},
            recipient_name="Charlie",
            recipient_email="charlie@s.com",
        )
        body = render_body(ctx)
        assert "Senior Developer" in body or "Startup" in body
        assert len(body) > 20


class TestPersonalizer:
    def test_empty_job(self):
        ctx = build_context(recipient_name="Test")
        assert ctx.recipient_name == "Test"
        assert ctx.company == ""

    def test_company_insight(self):
        ctx = build_context(
            job={"title": "ML Engineer", "company": "AI Co",
                 "description": "machine learning models"},
            recipient_name="Test",
        )
        assert "AI/ML" in ctx.company_insight or "AI Co" in ctx.company_insight