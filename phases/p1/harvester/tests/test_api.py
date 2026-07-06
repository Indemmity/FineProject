"""Integration tests for the harvester API endpoints."""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from httpx import AsyncClient, ASGITransport
from app.main import create_app

app = create_app()


class MockScalarResult:
    """Mocks SQLAlchemy's ScalarResult — .all() is async."""

    def __init__(self, data=None):
        self._data = data or []

    async def all(self):
        return self._data

    def one_or_none(self):
        return None if not self._data else self._data[0]


class MockResult:
    """Mocks SQLAlchemy's Result — .scalars() is sync, returns ScalarResult."""

    def __init__(self, data=None):
        self._data = data

    def scalars(self):
        return MockScalarResult(self._data)

    def one(self):
        return self._data

    def scalar_one_or_none(self):
        if self._data is None:
            return None
        return self._data[0] if isinstance(self._data, list) else self._data

    def first(self):
        if isinstance(self._data, list) and self._data:
            return self._data[0]
        return self._data


class MockAsyncSession:
    """Mocks AsyncSession — .execute() is async."""

    def __init__(self):
        self.execute = AsyncMock()
        self.commit = AsyncMock()
        self.rollback = AsyncMock()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        pass

    async def close(self):
        pass


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.fixture
def mock_db():
    with patch("app.store.get_session") as mock:
        session = MockAsyncSession()
        mock.return_value = session
        yield session


# ─── DB-free tests ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health_endpoint(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "harvester"


@pytest.mark.asyncio
async def test_search_validation_error(client):
    response = await client.get("/api/jobs/search")
    assert response.status_code in (404, 422)


@pytest.mark.asyncio
async def test_search_bad_id(client):
    response = await client.get("/api/jobs/search/nonexistent-id")
    assert response.status_code == 404


# ─── DB-dependent tests ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_jobs_empty(client, mock_db):
    mock_db.execute.return_value = MockResult([])
    response = await client.get("/api/jobs/")
    assert response.status_code == 200
    data = response.json()
    assert "jobs" in data


@pytest.mark.asyncio
async def test_list_sources(client, mock_db):
    # get_sources_summary iterates over sources and calls execute 3 times
    mock_db.execute.return_value = MockResult((0, None))
    response = await client.get("/api/jobs/sources")
    assert response.status_code == 200
    data = response.json()
    assert "sources" in data
    source_names = [s["name"] for s in data["sources"]]
    assert "remoteok" in source_names
    assert "naukri" in source_names
    assert "wellfound" in source_names


@pytest.mark.asyncio
async def test_get_nonexistent_job(client, mock_db):
    mock_db.execute.return_value = MockResult(None)
    response = await client.get("/api/jobs/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_export_no_results(client, mock_db):
    mock_db.execute.return_value = MockResult([])
    response = await client.get("/api/jobs/export?keyword=xyznonexistent")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_api_error_format(client, mock_db):
    mock_db.execute.return_value = MockResult(None)
    response = await client.get("/api/jobs/99999999-9999-9999-9999-999999999999")
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data