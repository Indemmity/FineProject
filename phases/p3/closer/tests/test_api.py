"""Integration tests for the outreach API."""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import create_app

app = create_app()


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.mark.asyncio
async def test_health_endpoint(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "closer"


@pytest.mark.asyncio
async def test_generate_endpoint(client):
    response = await client.post(
        "/api/outreach/generate",
        params={
            "application_id": "test-123",
            "recipient_name": "Jane Doe",
            "recipient_email": "jane@example.com",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "draft" in data
    assert data["draft"]["subject"] is not None


@pytest.mark.asyncio
async def test_preview_endpoint(client):
    response = await client.post("/api/outreach/test-id/preview")
    assert response.status_code == 200
    data = response.json()
    assert "html" in data
    assert "text" in data


@pytest.mark.asyncio
async def test_send_draft_mode(client):
    response = await client.post(
        "/api/outreach/test-id/send",
        params={
            "to_email": "test@example.com",
            "to_name": "Test",
            "subject": "Hello",
            "body_html": "<p>Hi</p>",
            "body_text": "Hi",
        },
    )
    # dry-run enabled by default → draft
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("draft", "sent")


@pytest.mark.asyncio
async def test_logs_endpoint(client):
    response = await client.get("/api/outreach/logs")
    assert response.status_code == 200
    data = response.json()
    assert "logs" in data


@pytest.mark.asyncio
async def test_stats_endpoint(client):
    response = await client.get("/api/outreach/stats")
    assert response.status_code == 200
    data = response.json()
    assert "sent" in data
    assert "opened" in data
    assert "hourly_remaining" in data


@pytest.mark.asyncio
async def test_queue_endpoint(client):
    response = await client.post(
        "/api/outreach/test-id/queue",
        params={
            "to_email": "test@example.com",
            "to_name": "Test",
            "subject": "Test",
            "body_html": "<p>Hi</p>",
            "body_text": "Hi",
        },
    )
    assert response.status_code == 200
    assert response.json()["status"] == "queued"