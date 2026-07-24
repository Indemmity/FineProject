# Job Application Platform

This project is organized into **6 phases** (P0–P5), each in its own self-contained folder.

| Phase | Name | Status | Folder |
|---|---|---|---|
| **P0** | Foundation | ✅ Complete | `p0/` |
| **P1** | Job Harvester | ✅ Complete | `p1/` |
| **P2** | Resume Tailor | ✅ Complete | `p2/` |
| **P3** | The Closer | ✅ Complete | `p3/` |
| **P4** | Integration | ✅ Complete | `p4/` |
| **P5** | Polish | ✅ Complete | `p5/` |

Each phase is self-contained with its own apps, packages, services, configuration, and phase-specific README. Planning and architecture documents live in `/docs/` at the project root. Phases depend on earlier phases (P1 depends on P0, P2 depends on P0, etc.).

---

## Phase P0 — Foundation

**Goal:** Monorepo scaffolding, database schema, authentication, CI/CD, shared UI components.

### Contents

| Directory / File | Purpose |
|---|---|
| `apps/web/` | Next.js 15 frontend (App Router, auth, dashboard, login, Shadcn UI) |
| `packages/shared/` | Shared TypeScript types (Zod schemas), Drizzle ORM schema, DB migrations, auth session helpers |
| `packages/py-shared/` | Shared Python models (SQLAlchemy) matching the DB schema |
| `prompts/` | LLM prompt templates for resume analysis, tailoring, guardrails, outreach |
| `scripts/` | Utility scripts (DB migration runner) |
| `e2e/` | Playwright end-to-end tests |
| `uploads/` | Uploaded file storage |
| `.github/` | CI/CD workflows |
| Root configs | `tsconfig.json`, `vitest.config.ts`, `docker-compose.yml`, `.env.example`, `.prettierrc`, `pyproject.toml` |

### Key Commands

```bash
# From project root
npm run dev          # Start dev servers
npm run build        # Build all workspaces  
npm run db:migrate   # Apply DB migrations
npm run db:seed      # Seed demo data

# From phases/p0/
docker compose up    # Start PostgreSQL, Redis, and web app
```

### Status

**Complete.** All P0 tasks are implemented:
- Monorepo scaffolding (Next.js, FastAPI, Turborepo, shared packages)
- Database schema & migrations (PostgreSQL, Drizzle ORM, SQLAlchemy)
- Authentication (NextAuth.js with magic link, OAuth, JWT sessions)
- Shared UI components (Shadcn: Button, Card, Badge, Input, Dialog, Tabs, Sonner, Skeleton, ErrorBoundary)
- CI/CD (GitHub Actions, Docker setup, Vitest/pytest config, Vercel deployment config)

### Depends On

Nothing — this is the foundation phase.

---

## Phase P1 — Job Harvester Service

**Goal:** Multi-source job aggregation, filtering, deduplication, and REST API.

### Status

**Complete.** All P1 tasks are implemented:

#### P1.1 — Core Pipeline Port
- `models.py` — Pydantic schemas (`JobSearchRequest`, `JobResponse`, `SearchStatusResponse`) + SQLAlchemy `JobModel`
- `normalizer.py` — Date parsing (12+ formats), salary extraction (USD, INR, EUR, GBP), location normalization, experience inference
- `dedup.py` — Fuzzy matching via `thefuzz` (`token_set_ratio`), URL dedup, source+source_id dedup
- `filter.py` — Keyword scoring, location/remote/experience/date filters, sorted by relevance
- `store.py` — Async SQLAlchemy CRUD with upsert (conflict on source+source_id), search, pagination
- `pipeline.py` — `JobPipeline` orchestrator: fetch → normalize → filter → dedup → store (with parallel source fetching)

#### P1.2 — Source Adapters
- `adapters/base.py` — Abstract `JobSourceAdapter`, `SearchParams`, `RawJobListing` dataclasses
- `adapters/remoteok.py` — HTTP API client for remoteok.com
- `adapters/naukri.py` — Selenium-based scraper for naukri.com (headless, cookie consent, pagination)
- `adapters/wellfound.py` — Firecrawl-based extractor with HTTP fallback for wellfound.com
- `adapters/__init__.py` — Adapter factory registry
- `docs/extension-guide.md` — Interface contracts for adding new sources

#### P1.3 — REST API Endpoints
- `POST /api/jobs/search` — async search with polling
- `GET /api/jobs/search/{search_id}` — poll search status
- `GET /api/jobs/search?q=...` — quick sync search
- `GET /api/jobs/` — list jobs with filtering/pagination
- `GET /api/jobs/{id}` — get single job
- `DELETE /api/jobs/{id}` — delete job
- `GET /api/jobs/sources` — list available sources with metadata
- `GET /api/jobs/export` — CSV export of job listings

#### P1.4 — Export & CSV
- `exporters/csv.py` — CSV generation with proper headers
- `exporters/application.py` — Batch application creation from jobs
- `routes/export.py` — Streaming CSV download endpoint

#### P1.5 — Tests (71 passing)
- `test_normalizer.py` — 15+ test cases for date parsing, salary extraction, location normalization
- `test_dedup.py` — 10+ test cases for exact/fuzzy/edge-case duplicates
- `test_filter.py` — Per-filter tests + integration scenarios
- `test_api.py` — Endpoint tests with DB mocking
- `mock_data/` — Fixture files for reproducible tests

### How to Run Phase 1 Locally

#### 1. Install dependencies

```bash
cd phases/p1/harvester
pip install -r requirements.txt
pip install pytest pytest-asyncio   # only needed for tests
```

#### 2. Run the tests

```bash
python -m pytest tests/ -v
```

All 71 tests should pass.

#### 3. Start the server

```bash
uvicorn app.main:app --reload --port 8001
```

The API will be available at `http://localhost:8001`.

#### 4. Test the API

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

**Note:** The service connects to PostgreSQL at startup using the `DATABASE_URL` from `.env`. If no database is available, the health endpoint still works but API endpoints that query the database will return errors.

#### 5. Run via Docker

```bash
# From project root
docker compose up harvester

# Or build and run manually
cd phases/p1/harvester
docker build -t jobplatform-harvester .
docker run -p 8001:8001 jobplatform-harvester
```

### Depends On

- **P0** — Database schema and shared Python models

---

## Phase P2 — Resume Tailor Service

**Goal:** AI-powered resume analysis, tailoring, guardrails, and PDF export.

### Status

**Complete.** All P2 tasks are implemented across 7 sub-tasks.

#### P2.1 — Resume Parsing & Upload
- `packages/shared/lib/resume/parser.ts` — PDF/DOCX/TXT parser with section extraction (education, experience, skills, etc.)
- `apps/web/app/api/resume/upload/route.ts` — File upload API (multipart, 10 MB limit, type validation)
- `apps/web/app/api/resume/store.ts` — In-memory resume storage with CRUD operations
- `apps/web/components/resume/FileUploader.tsx` — Drag-and-drop upload UI with progress bar

#### P2.2 — LLM Client & Prompt System
- `packages/shared/lib/llm/client.ts` — Groq SDK wrapper with retry (3 attempts, exponential backoff), timeout (30s), circuit breaker (5 failures/60s window)
- `packages/shared/lib/llm/config.ts` — Env-based config with Zod validation (`GROQ_API_KEY`, `LLM_MODEL`, etc.)
- `packages/shared/lib/llm/prompts.ts` — Prompt template loader with variable interpolation and caching
- `packages/shared/lib/llm/cache.ts` — In-memory cache with TTL, pattern invalidation
- `packages/shared/lib/llm/mock.ts` — Deterministic mock responses for UI dev (auto-enabled when `MOCK_MODE=true`)
- `prompts/resume/analyze.txt` — Analysis prompt template
- `prompts/resume/tailor.txt` — Tailoring prompt template
- `prompts/resume/gaps.txt` — Gap analysis prompt template
- `prompts/guardrails/truthfulness.txt` — Guardrail verification prompt

#### P2.3 — Analysis Pipeline
- `packages/shared/lib/services/analyzer.ts` — Resume analyzer (score 0-100, skill breakdown, strengths/weaknesses)
- `packages/shared/lib/services/gap-analyzer.ts` — Gap analysis with importance ratings
- `apps/web/app/api/resume/[id]/analyze/route.ts` — `POST /api/resume/:id/analyze` endpoint
- `apps/web/components/resume/ScoreGauge.tsx` — Animated radial gauge (red < 40, yellow 40-70, green > 70)
- `apps/web/components/resume/GapList.tsx` — Expandable gap list grouped by importance

#### P2.4 — Tailoring Pipeline
- `packages/shared/lib/services/tailor.ts` — Per-section bullet rewriting via LLM
- `packages/shared/lib/services/diff.ts` — Line-by-line diff engine (added, removed, modified, unchanged)
- `apps/web/app/api/resume/[id]/tailor/route.ts` — `POST /api/resume/:id/tailor` endpoint
- `apps/web/components/resume/TailorButton.tsx` — "Generate Tailored Resume" button with ETA display
- `apps/web/components/resume/DiffViewer.tsx` — Side-by-side and unified diff views with color coding

#### P2.5 — Guardrail System
- `packages/shared/lib/services/guardrails.ts` — LLM-based guardrail checker (truthfulness, fabrication, seniority)
- `packages/shared/lib/services/guardrails/truthfulness.ts` — Title inflation and metric fabrication detection
- `packages/shared/lib/services/guardrails/fabrication.ts` — Company name, certification, and degree fabrication detection
- `packages/shared/lib/services/guardrails/seniority.ts` — Seniority level and years of experience validation
- `apps/web/components/resume/GuardrailBadge.tsx` — Pass/Warning/Fail badge with expandable details

#### P2.6 — PDF Export
- `packages/shared/lib/pdf/generator.ts` — HTML-to-PDF generation with styled output
- `packages/shared/lib/pdf/comparison.ts` — Comparison report (score, gaps, guardrails, side-by-side)
- `apps/web/app/api/resume/[id]/export/route.ts` — `POST /api/resume/:id/export` endpoint
- `apps/web/components/resume/DownloadButton.tsx` — Download buttons for tailored PDF and comparison report

#### P2.7 — Tests (23 passing)
- `packages/shared/__tests__/resume/parser.test.ts` — Section extraction, TXT parsing, edge cases
- `packages/shared/__tests__/llm/client.test.ts` — Cache operations, TTL, key hashing, pattern invalidation
- `packages/shared/__tests__/services/guardrails.test.ts` — Title inflation, metric fabrication, company/degree fabrication, seniority/experience inflation
- `packages/shared/__tests__/services/diff.test.ts` — Change detection, added/removed/modified lines, change counting

### Quick Start

```bash
# Ensure deps are installed
cd phases/p0 && npm install

# Run tests
cd phases/p0 && npx vitest run --config vitest.config.ts

# Start the web app (which includes resume API routes)
cd phases/p0 && npm run dev
```

### Key Dependencies Added

- **groq-sdk** — LLM API client (shared package)
- **mammoth** — DOCX text extraction (web app)
- **pdf-parse** — PDF text extraction (web app)

### Depends On

- **P0** — Database schema, auth, UI components, shared types

---

## Phase P3 — The Closer (Cold Email Outreach)

**Goal:** Cold email generation, preview, SMTP delivery, and audit logging.

### Status

**Complete.** All P3 tasks are implemented across 6 sub-tasks.

#### P3.1 — Email Generation
- `app/email_generator.py` — Jinja2 template-based email generation (cold + follow-up)
- `app/personalizer.py` — Personalisation context builder with company insight, resume highlights, intro/body/closing renderers
- `app/email_generator_llm.py` — LLM-powered generation placeholder (post-MVP, delegates to template generator)
- `app/templates/` — 4 templates: `cold_email.html`, `cold_email.txt`, `follow_up.html`, `follow_up.txt`

#### P3.2 — SMTP Delivery
- `app/email_sender.py` — `smtplib`-based sender with STARTTLS, `Message-ID`/`In-Reply-To` headers, dry-run mode
- `app/rate_limiter.py` — Token bucket rate limiter (20/hr, 100/day per user) with `Retry-After` headers
- `app/queue.py` — In-memory queue with retry (linear backoff 30s→60s→120s), circuit breaker (3 failures → 5min pause)

#### P3.3 — Preview Engine
- `app/preview.py` — HTML email renderer with link extraction and read time estimation
- `cli/main.py` — Terminal CLI with preview/send workflows and interactive prompt
- `cli/preview.py` — Colorized terminal email preview
- `apps/web/components/outreach/EmailPreview.tsx` — Iframe HTML preview with toggleable text view, "Looks Good"/"Edit" buttons

#### P3.4 — Audit Logging
- `app/logger.py` — In-memory outreach logger with per-user indexing, stats aggregation (open/reply/bounce rates)
- `app/delivery_tracker.py` — Delivery event tracking (delivered, bounced, opened, replied)
- `app/export.py` — CSV export of outreach logs
- `routes/outreach.py` — 8 endpoints (generate, preview, send, queue, logs, stats, track, export)

#### P3.5 — Outreach Console UI
- `apps/web/components/outreach/SendQueue.tsx` — List with status badges, search/filter, send/delete actions
- `apps/web/components/outreach/DeliveryLog.tsx` — Sortable table with recipient, subject, date, status, resend
- `apps/web/components/outreach/StatsCards.tsx` — 4 metric cards (total sent, open rate, reply rate, bounce rate)
- `apps/web/components/outreach/VolumeGauge.tsx` — Hourly/daily cap progress bars (yellow at 80%, red at 95%)

#### P3.6 — Tests (22 passing)
- `tests/test_email_generator.py` — Template rendering, personalisation, edge cases (7 tests)
- `tests/test_email_sender.py` — Rate limiter (hourly/daily/user isolation/reset), dry-run, SMTP failure (8 tests)
- `tests/test_api.py` — All 8 endpoints tested with mock data (7 tests)

### Quick Start

```bash
cd phases/p3/closer
pip install -r requirements.txt
python -m pytest tests/ -v          # 22 tests
uvicorn app.main:app --reload --port 8002  # FastAPI on :8002
```

### CLI Usage

```bash
# Preview a cold email
python -m cli.main preview --company "TechCorp" --role "Engineer" --name "Jane"

# Send an email (interactive)
python -m cli.main send --email "jane@techcorp.com" --company "TechCorp"
```

### API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/outreach/generate` | Generate email draft |
| POST | `/api/outreach/:id/preview` | Preview rendered email |
| POST | `/api/outreach/:id/send` | Send email (respects rate limits, dry-run) |
| POST | `/api/outreach/:id/queue` | Queue email for delayed send |
| POST | `/api/outreach/:id/track` | Track delivery event |
| GET | `/api/outreach/logs` | Paginated outreach logs |
| GET | `/api/outreach/stats` | Aggregated stats + remaining capacity |
| GET | `/api/outreach/export` | CSV export of logs |

### Depends On

- **P0** — SMTP config, rate limiting defaults, UI components

---

## Phase P4 — Integration & Pipeline Orchestrator

**Goal:** Connect all three services into a unified platform with a pipeline orchestrator, unified UI, application tracking, and real-time event bus.

### Status

**Complete.** All P4 tasks are implemented across 5 sub-tasks.

### Contents

| Directory / File | Purpose |
|---|---|
| `orchestrator/src/main.ts` | Express entry point (port 8100) |
| `orchestrator/src/pipeline.ts` | State machine (12 states) + in-process event bus |
| `orchestrator/src/routes/pipeline.ts` | REST API (start, get, transition, list) |
| `orchestrator/src/workflows/full-pipeline.ts` | 7-step workflow with service integration |
| `orchestrator/src/state.ts` | Pipeline persistence + cleanup |
| `orchestrator/src/recovery.ts` | Error recovery with retry logic |
| `orchestrator/src/analytics.ts` | Event-based analytics consumer |
| `orchestrator/src/followups.ts` | Follow-up scheduler (3/7/14 day reminders) |

#### P4.1 — Pipeline Orchestrator
- **State machine** — 12 states (`idle` → `searching_jobs` → ... → `completed`/`failed`) with valid transition matrix
- **REST API** — `POST /start`, `GET /:id`, `POST /:id/transition`, `GET /`
- **Workflow** — 7-step pipeline: search → upload → analyze → tailor → guardrail → generate → send
- **State persistence** — `persistState()`, `recoverOnRestart()`, `cleanupAbandoned()` (24h TTL)
- **Error recovery** — `recoverPipeline()` with max 3 retries, user-friendly error messages

#### P4.2 — Event Bus
- `packages/shared/events/bus.ts` — Typed Pub/Sub with in-memory backend (Redis-ready)
- `packages/shared/events/schemas.ts` — 11 typed event interfaces (harvester, resume, outreach, pipeline)
- `apps/web/lib/websocket.ts` — Client-side WebSocket adapter with subscription management
- `orchestrator/src/analytics.ts` — Listens to all events, aggregates dashboard stats

#### P4.3 — Unified UI
- **Dashboard** (`/dashboard/page.tsx`) — Stats cards (Jobs Discovered, Applications, Outreach Sent)
- **Resume Studio** (`/dashboard/resume/page.tsx`) — Upload zone, quick actions, activity log
- **Outreach Console** (`/dashboard/outreach/page.tsx`) — Stats cards, send queue, delivery log
- **Application Tracker** (`/dashboard/tracker/page.tsx`) — 9-column Kanban board with metric cards
- **Tracker components** — `KanbanBoard` (drag-and-drop), `StatusBadge` (color-coded), `MetricCards`

#### P4.4 — Application Tracking
- `packages/shared/lib/services/applications.ts` — CRUD with status transition validation + timeline events
- `apps/web/app/api/applications/route.ts` — REST API (GET, POST, PATCH, DELETE)
- `packages/shared/lib/services/stats.ts` — Dashboard stats aggregation
- `orchestrator/src/followups.ts` — Follow-up reminders (3d, 7d, 14d after outreach)

#### P4.5 — Integration Tests
- `e2e/full-pipeline.spec.ts` — 14 test cases covering the full pipeline
- `e2e/multi-user.spec.ts` — Multi-user isolation test
- `e2e/concurrent.spec.ts` — Concurrent pipeline test
- `e2e/error-recovery.spec.ts` — Error recovery test

### Quick Start

```bash
# Start the orchestrator
cd phases/p4/orchestrator
npm install
npx tsx src/main.ts

# Access the API
curl http://localhost:8100/health
curl -X POST http://localhost:8100/api/pipeline/start

# Run all integration tests
cd phases/p0
npx vitest run --config vitest.config.ts
```

### API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/api/pipeline/start` | Create and start a new pipeline |
| GET | `/api/pipeline/` | List all pipelines |
| GET | `/api/pipeline/:id` | Get pipeline context |
| POST | `/api/pipeline/:id/transition` | Move pipeline to next state |

### Depends On

- **P1** — Job Harvester API (for job search step)
- **P2** — Resume Tailor API (for analyze/tailor/guardrail steps)
- **P3** — The Closer API (for outreach steps)

---

## Phase P5 — Polish

**Goal:** Performance optimization, security hardening, UX refinement, and mobile responsiveness.

### Status

**Complete.** All P5 tasks are implemented across 4 sub-tasks.

#### P5.1 — Performance
- **LLM cache warm-up** — `packages/shared/lib/llm/warmup.ts` pre-populates cache with common queries at startup
- **Bundle optimization** — `next.config.mjs` configured with `removeConsole` in production, image format optimization (WebP/AVIF), device sizes, and immutable static asset caching (1 year)
- **API response caching** — `Cache-Control: no-store` for API routes, `public, max-age=31536000, immutable` for static assets

#### P5.2 — Security Hardening
- **Rate limiting** — `apps/web/lib/rate-limit.ts` token bucket middleware (60 req/min per IP, 120 req/min per user) with `Retry-After` headers
- **Input sanitization** — `packages/shared/lib/security/sanitize.ts` strips HTML tags/event handlers/JS protocol, validates file MIME types + magic bytes
- **PII masking** — `packages/shared/lib/security/pii.ts` masks phone numbers, emails, SSNs, addresses before LLM calls; `restorePII()` to reverse after processing
- **CSRF protection** — `packages/shared/lib/security/csrf.ts` double-submit cookie pattern
- **Security headers** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-XSS-Protection, Permissions-Policy in `next.config.mjs`
- **Dependency audit** — `.github/dependabot.yml` with weekly npm/pip/GitHub Actions updates

#### P5.3 — UX Refinement
- **Mobile responsive** — All dashboard pages use responsive Tailwind classes (md:grid-cols, responsive padding)
- **Empty states** — `components/ui/empty-state.tsx` reusable component with icon, title, description, CTA button
- **Loading state** — `app/loading.tsx` with centered spinner
- **Custom 404 page** — `app/not-found.tsx` with "Go to Dashboard" link
- **Custom error page** — `app/error.tsx` with retry button and error message display
- **Onboarding flow** — `components/ui/onboarding.tsx` step-by-step guided tour with localStorage dismissal
- **Keyboard shortcuts** — `components/ui/keyboard-shortcuts.tsx` with configurable shortcuts, `?` help overlay

#### P5.4 — Monitoring & Observability
- **Structured logging** — `apps/web/lib/logger.ts` JSON logger with level, timestamp, service, requestId, userId, duration fields
- **Health check** — `apps/web/lib/health.ts` enhanced `/health` returning DB/Redis/LLM dependency status + uptime
- **Metrics export** — `apps/web/lib/metrics.ts` Prometheus-compatible request counter + latency histogram
- **Distributed tracing** — `apps/web/lib/tracing.ts` OpenTelemetry-compatible trace IDs via `x-trace-id`/`x-span-id` headers with span recording
- **Alert rules** — `docs/AlertRules.md` defines thresholds for LLM, SMTP, application health, infrastructure, and business metrics

### Tests Added
- `packages/shared/__tests__/security/sanitize.test.ts` — 9 tests covering PII masking (phone, email, SSN, restore), HTML sanitization, filename sanitization, MIME validation, magic byte validation
