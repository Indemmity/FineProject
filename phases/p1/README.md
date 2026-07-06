# Phase P1 — Job Harvester Service

**Goal:** Multi-source job aggregation, filtering, deduplication, and REST API.

## Status

**Complete.** All P1 tasks are implemented:

### P1.1 — Core Pipeline Port
- `models.py` — Pydantic schemas (`JobSearchRequest`, `JobResponse`, `SearchStatusResponse`) + SQLAlchemy `JobModel`
- `normalizer.py` — Date parsing (12+ formats), salary extraction (USD, INR, EUR, GBP), location normalization, experience inference
- `dedup.py` — Fuzzy matching via `thefuzz` (`token_set_ratio`), URL dedup, source+source_id dedup
- `filter.py` — Keyword scoring, location/remote/experience/date filters, sorted by relevance
- `store.py` — Async SQLAlchemy CRUD with upsert (conflict on source+source_id), search, pagination
- `pipeline.py` — `JobPipeline` orchestrator: fetch → normalize → filter → dedup → store (with parallel source fetching)

### P1.2 — Source Adapters
- `adapters/base.py` — Abstract `JobSourceAdapter`, `SearchParams`, `RawJobListing` dataclasses
- `adapters/remoteok.py` — HTTP API client for remoteok.com
- `adapters/naukri.py` — Selenium-based scraper for naukri.com (headless, cookie consent, pagination)
- `adapters/wellfound.py` — Firecrawl-based extractor with HTTP fallback for wellfound.com
- `adapters/__init__.py` — Adapter factory registry
- `docs/extension-guide.md` — Interface contracts for adding new sources

### P1.3 — REST API Endpoints
- `POST /api/jobs/search` — async search with polling
- `GET /api/jobs/search/{search_id}` — poll search status
- `GET /api/jobs/search?q=...` — quick sync search
- `GET /api/jobs/` — list jobs with filtering/pagination
- `GET /api/jobs/{id}` — get single job
- `DELETE /api/jobs/{id}` — delete job
- `GET /api/jobs/sources` — list available sources with metadata
- `GET /api/jobs/export` — CSV export of job listings

### P1.4 — Export & CSV
- `exporters/csv.py` — CSV generation with proper headers
- `exporters/application.py` — Batch application creation from jobs
- `routes/export.py` — Streaming CSV download endpoint

### P1.5 — Tests (71 passing)
- `test_normalizer.py` — 15+ test cases for date parsing, salary extraction, location normalization
- `test_dedup.py` — 10+ test cases for exact/fuzzy/edge-case duplicates
- `test_filter.py` — Per-filter tests + integration scenarios
- `test_api.py` — Endpoint tests with DB mocking
- `mock_data/` — Fixture files for reproducible tests

## How to Run Phase 1 Locally

Phase 1 (Job Harvester) is a standalone FastAPI service. You can run it independently
without the rest of the platform for development and testing.

### 1. Install dependencies

```bash
cd phases/p1/harvester
pip install -r requirements.txt
pip install pytest pytest-asyncio   # only needed for tests
```

### 2. Run the tests

```bash
python -m pytest tests/ -v
```

All 71 tests should pass.

### 3. Start the server

```bash
uvicorn app.main:app --reload --port 8001
```

The API will be available at `http://localhost:8001`.

### 4. Test the API

```bash
# Health check
curl http://localhost:8001/health

# List available sources
curl http://localhost:8001/api/jobs/sources

# Search jobs (runs pipeline against live sources)
curl -X POST http://localhost:8001/api/jobs/search \
  -H "Content-Type: application/json" \
  -d '{"keywords": ["software engineer"]}'

# List harvested jobs
curl http://localhost:8001/api/jobs/
```

**Note:** The service connects to PostgreSQL at startup using the `DATABASE_URL` from
`.env`. If no database is available, the health endpoint still works but API endpoints
that query the database will return errors. For full functionality, run
`docker compose up` from the project root to start PostgreSQL and Redis.

### 5. Run via Docker

```bash
# From project root
docker compose up harvester

# Or build and run manually
cd phases/p1/harvester
docker build -t jobplatform-harvester .
docker run -p 8001:8001 jobplatform-harvester
```

## Quick Start

```bash
cd phases/p1/harvester
pip install -r requirements.txt
python -m pytest tests/  # Run tests
uvicorn app.main:app --reload --port 8001  # Start service
```

## Depends On

- **P0** — Database schema and shared Python models