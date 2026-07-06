# Job Application Platform — Implementation Plan

> **Audience**: Engineering team building the platform.  
> **Status**: V1 — Covers P0 through P5 with sequenced tasks, dependencies, and deliverables.

---

## Phase Overview

| Phase                  | Focus                                                   | Duration Target | Dependencies |
| ---------------------- | ------------------------------------------------------- | --------------- | ------------ |
| **P0 — Foundation**    | Project scaffolding, DB, auth, CI/CD, configuration     | —               | None         |
| **P1 — Job Harvester** | Multi-source job aggregation, filtering, deduplication  | —               | P0           |
| **P2 — Resume Tailor** | AI-powered resume analysis, tailoring, guardrails, PDF  | —               | P0           |
| **P3 — The Closer**    | Cold email generation, preview, SMTP delivery, audit    | —               | P0           |
| **P4 — Integration**   | Pipeline orchestrator, unified UI, application tracking | —               | P1, P2, P3   |
| **P5 — Polish**        | Performance, security hardening, UX refinement, mobile  | —               | P4           |

---

## Phase P0 — Foundation

### Goal

Set up the monorepo, database schema, authentication, CI/CD pipeline, and shared libraries that all services depend on.

### Tasks

#### P0.1 — Monorepo Scaffolding

| #   | Task                                            | File / Module                             | Details                                                                                            | Depends On |
| --- | ----------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------- |
| 1   | Initialize Next.js app (App Router, TypeScript) | `apps/web/`                               | Create with `create-next-app`, configure TypeScript strict mode, set up Tailwind CSS 4 + Shadcn UI | —          |
| 2   | Initialize FastAPI projects                     | `services/harvester/`, `services/closer/` | Python 3.11+, FastAPI app with health endpoint (`/health`), CORS middleware, structured logging    | —          |
| 3   | Set up shared TypeScript package                | `packages/shared/`                        | Shared types (`Job`, `Application`, `Resume`, `OutreachLog`), Zod schemas, utility functions       | —          |
| 4   | Set up shared Python package                    | `packages/py-shared/`                     | Shared Python models, config readers, logging helpers                                              | —          |
| 5   | Configure Turborepo                             | Root `turbo.json`                         | Pipeline definitions for build, lint, test across all workspaces                                   | 1, 2, 3, 4 |
| 6   | ESLint + Prettier config                        | Root config files                         | Consistent linting and formatting across TS and Python projects                                    | 5          |
| 7   | `.env.example` files                            | Each service root                         | Document all required environment variables per service                                            | 1, 2       |

**Success Criteria**:

- `npm run dev` starts Next.js on `:3000` with working Tailwind + Shadcn
- `uvicorn` starts each FastAPI service with `/health` returning `200 OK`
- `npm run build` completes without errors across all workspaces
- Shared types can be imported by both `apps/web` and `packages/shared`

---

#### P0.2 — Database Schema & Migrations

| #   | Task                               | File / Module                                | Details                                                                                                                                               | Depends On |
| --- | ---------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | Write initial PostgreSQL migration | `packages/shared/db/migrations/001_init.sql` | Create tables: `users`, `jobs`, `resumes`, `applications`, `outreach_logs`, `timeline_events`; indexes on `user_id`, `job_id`, `status`, `created_at` | P0.1.3     |
| 2   | Set up Drizzle ORM (TypeScript)    | `packages/shared/db/schema.ts`               | Type-safe schema definitions matching models from `architecture.md §3.1`                                                                              | 1          |
| 3   | Set up SQLAlchemy models (Python)  | `packages/py-shared/db/models.py`            | Python ORM models matching the same schema                                                                                                            | 1          |
| 4   | Write seed data script             | `packages/shared/db/seed.ts`                 | Demo user, sample jobs, sample resume for development                                                                                                 | 2          |
| 5   | Migration runner script            | `scripts/migrate.sh`                         | Apply migrations, run seeds, verify schema                                                                                                            | 2, 3       |

**Schema** (tables from `architecture.md §3.1`):

- `users` — id, email, name, preferences (JSONB), created_at
- `jobs` — id, source, source_id, title, company, location, description, salary_range, job_type, remote, experience_level, posted_date, url, search_keyword, scraped_at, raw (JSONB)
- `resumes` — id, user_id, original_file_path, parsed_text, tailored_text (JSONB per job), match_score, gap_analysis (JSONB), created_at
- `applications` — id, user_id, job_id, resume_id, status (enum), match_score, gap_analysis (JSONB), tailored_resume_text, cover_letter_text, applied_at, notes
- `timeline_events` — id, application_id, event, detail, source, timestamp
- `outreach_logs` — id, application_id, status (enum), recipient_email, recipient_name, subject, body_html, body_text, sent_at, delivery_status, opened_at, replied_at, error_message, attachments (JSONB)

**Success Criteria**:

- `npm run db:migrate` creates all tables in a local PostgreSQL instance
- `npm run db:seed` populates demo data
- Drizzle and SQLAlchemy models agree on column types and relationships
- All foreign key constraints and indexes verified

---

#### P0.3 — Authentication

| #   | Task                  | File / Module                                  | Details                                                                             | Depends On |
| --- | --------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------- | ---------- |
| 1   | Auth API routes       | `apps/web/app/api/auth/[...nextauth]/route.ts` | NextAuth.js with credentials provider (email + magic link for MVP)                  | P0.1.1     |
| 2   | Auth middleware       | `apps/web/middleware.ts`                       | Protect `/dashboard/*`, `/api/*` routes; redirect unauthenticated users to `/login` | 1          |
| 3   | Login page            | `apps/web/app/login/page.tsx`                  | Email input → magic link sent; or OAuth buttons (GitHub, Google)                    | 2          |
| 4   | Session management    | `packages/shared/auth/session.ts`              | JWT token handling, refresh logic, session persistence                              | 1          |
| 5   | OAuth provider config | `.env.example`                                 | Google OAuth, GitHub OAuth client IDs/secrets                                       | 4          |

**Success Criteria**:

- User can sign up with email + magic link
- Authenticated requests include valid JWT in `Authorization` header
- Unauthenticated requests to protected routes return 401
- Session persists across page reloads (via HTTP-only cookie)

---

#### P0.4 — Shared UI Components

| #   | Task              | File / Module                               | Details                                                                  | Depends On |
| --- | ----------------- | ------------------------------------------- | ------------------------------------------------------------------------ | ---------- |
| 1   | Set up Shadcn UI  | `apps/web/components/ui/`                   | Install base components: Button, Input, Card, Dialog, Toast, Badge, Tabs | P0.1.1     |
| 2   | Layout components | `apps/web/components/layout/`               | AppShell, Sidebar, Navbar, Footer with responsive breakpoints            | 1          |
| 3   | Loading states    | `apps/web/components/ui/skeleton.tsx`       | Skeleton loaders matching card/list layouts                              | 2          |
| 4   | Error boundary    | `apps/web/components/ui/error-boundary.tsx` | React error boundary with retry button and toast notification            | 2          |

**Success Criteria**:

- All Shadcn components render correctly in Storybook or in-page
- Layout is responsive (mobile, tablet, desktop)
- Loading skeletons animate correctly
- Error boundary catches rendering errors and shows retry option

---

#### P0.5 — CI/CD Pipeline

| #   | Task                    | File / Module                                          | Details                                                                                       | Depends On     |
| --- | ----------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------- | -------------- |
| 1   | GitHub Actions workflow | `.github/workflows/ci.yml`                             | Trigger on PR to `main`: lint → type-check → test → build                                     | P0.1.5         |
| 2   | Docker setup            | `Dockerfile` per service, `docker-compose.yml` at root | Multi-stage builds for Next.js, FastAPI services; Compose for local dev with Postgres + Redis | P0.1.1, P0.1.2 |
| 3   | Test runner config      | Vitest config for TS, pytest config for Python         | Coverage thresholds, test patterns, reporters                                                 | P0.1.5         |
| 4   | Deployment config       | K8s manifests or `fly.toml` / `vercel.json`            | Service definitions, health checks, resource limits, env vars                                 | 2              |

**Success Criteria**:

- PR workflow runs all checks in under 5 minutes
- `docker compose up` starts all services and they can communicate
- All tests pass in CI
- Deployment to staging succeeds via CI

---

## Phase P1 — Job Harvester Service

### Goal

Port the existing `the-harvester-job-agent` Python code into a FastAPI service with a REST API, keeping the same scraping adapters, pipeline logic, and CSV export while adding a persistence layer and API endpoints.

### Tasks

#### P1.1 — Core Pipeline Port

| #   | Task                  | File / Module                          | Details                                                                                                                      | Depends On |
| --- | --------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | Models & schemas      | `services/harvester/app/models.py`     | SQLAlchemy models + Pydantic request/response schemas matching `architecture.md §3.2`                                        | P0.2.3     |
| 2   | Config module         | `services/harvester/app/config.py`     | Load env vars (source URLs, timeout, user-agent rotation), validate with Pydantic `BaseSettings`                             | P0.1.2     |
| 3   | Pipeline orchestrator | `services/harvester/app/pipeline.py`   | `JobPipeline` class: receive search params → run all source adapters → normalize → merge → filter → dedup → store → return   | 1, 2       |
| 4   | Normalizer            | `services/harvester/app/normalizer.py` | Transform raw source data into shared `NormalizedJob` schema; handle date parsing, salary extraction, location normalization | 1          |
| 5   | Deduplication engine  | `services/harvester/app/dedup.py`      | Fuzzy title + company matching (Levenshtein distance < 0.85); URL dedup; configurable thresholds                             | 1          |
| 6   | Relevance filter      | `services/harvester/app/filter.py`     | Keyword relevance scoring, location filter, remote-only filter, experience level matcher, date recency                       | 1          |
| 7   | Job store             | `services/harvester/app/store.py`      | CRUD operations for jobs table; batch insert with conflict handling (upsert on `source + source_id`)                         | P0.2.3     |

**Success Criteria**:

- `JobPipeline` processes all three sources and returns normalized results
- Dedup correctly identifies duplicate listings across sources
- Filters (location, remote, experience, date) work correctly in isolation and combination
- Jobs are persisted to PostgreSQL with no duplicate entries

---

#### P1.2 — Source Adapters

| #   | Task                | File / Module                                  | Details                                                                                                                                           | Depends On |
| --- | ------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | Base adapter class  | `services/harvester/app/adapters/base.py`      | Abstract `JobSourceAdapter` with `search(params) → RawJobListing[]` and `normalize(raw) → NormalizedJob`                                          | P1.1.1     |
| 2   | Naukri adapter      | `services/harvester/app/adapters/naukri.py`    | Selenium-based scraper; handle pagination, cookie consent, rate limiting; extract title, company, location, salary, description, posted date, URL | 1          |
| 3   | RemoteOK adapter    | `services/harvester/app/adapters/remoteok.py`  | Public API client at `https://remoteok.com/api`; parse JSON response, map fields to normalized schema                                             | 1          |
| 4   | Wellfound adapter   | `services/harvester/app/adapters/wellfound.py` | Firecrawl-based extraction; handle search URL construction, list parsing, detail extraction                                                       | 1          |
| 5   | Adapter factory     | `services/harvester/app/adapters/__init__.py`  | Registry mapping source names to adapter classes; `get_adapter(source)` for dynamic loading                                                       | 1, 2, 3, 4 |
| 6   | Extensibility guide | `services/harvester/docs/extension-guide.md`   | Document interface contracts for adding new sources                                                                                               | 5          |

**Success Criteria**:

- Each adapter independently fetches and normalizes real job listings
- Naukri adapter runs headless Selenium and handles common blocking patterns
- RemoteOK adapter returns results within 5s
- Wellfound adapter extracts at least title, company, location for each listing
- Adding a new source requires only one new file implementing the adapter interface

---

#### P1.3 — REST API Endpoints

| #   | Task               | File / Module                                        | Details                                                                                                                                        | Depends On |
| --- | ------------------ | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | Search endpoint    | `services/harvester/app/routes/jobs.py`              | `POST /api/jobs/search` — accept search params, run pipeline asynchronously, return `{ searchId, status: 'processing' }` with polling endpoint | P1.1.3     |
| 2   | Poll/Search status | `services/harvester/app/routes/jobs.py`              | `GET /api/jobs/search/:searchId` — return status, progress, and results when done                                                              | 1          |
| 3   | Job CRUD           | `services/harvester/app/routes/jobs.py`              | `GET /api/jobs/:id`, `DELETE /api/jobs/:id`, `POST /api/jobs/:id/refresh`                                                                      | P1.1.7     |
| 4   | Sources list       | `services/harvester/app/routes/jobs.py`              | `GET /api/jobs/sources` — return available sources with metadata (name, status, lastScraped)                                                   | P1.2.5     |
| 5   | Batch search       | `services/harvester/app/routes/jobs.py`              | `POST /api/jobs/batch` — accept array of search queries, run in parallel with rate limiting                                                    | 1          |
| 6   | Error handling     | `services/harvester/app/middleware/error_handler.py` | Exception → `ApiError` response mapping; HTTP status codes per error type                                                                      | 1          |

**Success Criteria**:

- All endpoints return correct response schemas
- Asynchronous search returns immediately with a search ID, then resolvable via polling
- Errors return consistent `ApiError` JSON responses
- Rate limiting returns 429 when exceeded

---

#### P1.4 — Export & CSV

| #   | Task                  | File / Module                                     | Details                                                                                                               | Depends On |
| --- | --------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | CSV exporter          | `services/harvester/app/exporters/csv.py`         | `export_to_csv(jobs: Job[], filepath) → str` — write jobs to CSV with headers matching `architecture.md` data schema  | P1.1.1     |
| 2   | Export endpoint       | `services/harvester/app/routes/export.py`         | `GET /api/jobs/export?searchId=X&format=csv` — trigger export and return file download                                | 1, P1.3.1  |
| 3   | Export to application | `services/harvester/app/exporters/application.py` | `export_as_applications(jobs: Job[], userId) → Application[]` — batch-create `Application` records from selected jobs | 1, P0.2.3  |

**Success Criteria**:

- CSV export produces valid UTF-8 CSV readable by Excel/Google Sheets
- Export endpoint streams the file with correct Content-Type and Content-Disposition
- Batch application creation works for up to 50 jobs at once

---

#### P1.5 — Harvesting Tests

| #   | Task                      | File / Module                                 | Details                                                                                                                     | Depends On |
| --- | ------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | Unit tests for normalizer | `services/harvester/tests/test_normalizer.py` | 15+ test cases: date parsing (various formats), salary extraction (`$100k-$150k`, `₹12LPA`, `Negotiable`), location parsing | P1.1.4     |
| 2   | Unit tests for dedup      | `services/harvester/tests/test_dedup.py`      | 10+ test cases: exact match, fuzzy match, different companies same title, edge cases                                        | P1.1.5     |
| 3   | Unit tests for filters    | `services/harvester/tests/test_filter.py`     | Per-filter tests: location, remote, experience level, date recency                                                          | P1.1.6     |
| 4   | Integration tests for API | `services/harvester/tests/test_api.py`        | Test each endpoint with mocked adapters; verify response schemas and error codes                                            | P1.3       |
| 5   | Mock adapter data         | `services/harvester/tests/mock_data/`         | Fixture files with raw source data for reproducible tests                                                                   | 2, 3, 4    |

**Success Criteria**:

- 95%+ code coverage on normalizer, dedup, and filter modules
- Integration tests cover all success and error paths for each endpoint
- Tests run in under 30s total
- CI includes the harvester test suite

---

## Phase P2 — Resume Tailor Service

### Goal

Port the existing `ResumeBuilder` (Resume Shapeshifter) Next.js logic into the platform's service layer, focusing on the AI pipeline: resume parsing, JD analysis, tailored rewriting, guardrails, and PDF export.

### Tasks

#### P2.1 — Resume Parsing & Upload

| #   | Task                    | File / Module                                 | Details                                                                                                                                               | Depends On     |
| --- | ----------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 1   | File upload API         | `apps/web/app/api/resume/upload/route.ts`     | Accept multipart file upload (PDF, DOCX, TXT); validate file type and size (< 10MB); stream to file store; return `resumeId`                          | P0.1.1, P0.4.1 |
| 2   | Text extraction service | `packages/shared/lib/resume/parser.ts`        | PDF parsing (pdf.js/pdf-parse), DOCX parsing (mammoth), TXT passthrough; extract structured sections: contact, summary, experience, education, skills | 1              |
| 3   | Resume storage          | `apps/web/app/api/resume/store.ts`            | Save parsed text + file path to `resumes` table; retrieve by ID; delete                                                                               | P0.2.2         |
| 4   | Resume upload UI        | `apps/web/components/resume/FileUploader.tsx` | Drag-and-drop zone, file type validation, upload progress bar, success/error states                                                                   | 1, P0.4.1      |

**Success Criteria**:

- PDF, DOCX, and TXT uploads all extract readable text correctly
- Multi-column PDFs are handled (text order preserved as much as possible)
- File size > 10MB is rejected with clear error
- Upload progress bar updates in real-time (via `xhr.upload.onprogress` or fetch streaming)

---

#### P2.2 — LLM Client & Prompt System

| #   | Task                   | File / Module                                          | Details                                                                                                                                                 | Depends On |
| --- | ---------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | LLM client             | `packages/shared/lib/llm/client.ts`                    | Groq SDK wrapper with retry (3 attempts, exponential backoff 1s→10s), timeout (30s), Zod response validation, circuit breaker (5 failures / 60s window) | P0.1.3     |
| 2   | Prompt template loader | `packages/shared/lib/llm/prompts.ts`                   | Load `.txt` templates from `prompts/` directory, interpolate variables, handle missing variables error                                                  | 1          |
| 3   | Prompt template files  | `prompts/resume/analyze.txt`, `tailor.txt`, `gaps.txt` | Templates from `architecture.md §5.3` with variable placeholders (`{jd_excerpt}`, `{original_bullet}`, `{target_skills}`)                               | 2          |
| 4   | LLM cache              | `packages/shared/lib/llm/cache.ts`                     | Redis-backed cache with key hash generation, TTL from `architecture.md §5.5`, invalidation on resume re-upload                                          | P0.2.2     |
| 5   | Mock LLM provider      | `packages/shared/lib/llm/mock.ts`                      | Return deterministic mock responses for UI development without API calls; toggle via `MOCK_MODE=true`                                                   | 1          |
| 6   | LLM configuration      | `packages/shared/lib/llm/config.ts`                    | Load env vars per `architecture.md §5.4` (`LLMConfig` interface); validate on startup                                                                   | 1          |

**Success Criteria**:

- LLM client handles API timeout → retry → circuit breaker correctly
- All five prompt templates load and render with sample variables
- Cache returns cached response for identical inputs (same resume + same JD)
- Mock mode returns realistic sample data without calling Groq API
- Zod validation catches malformed LLM responses and triggers retry

---

#### P2.3 — Analysis Pipeline

| #   | Task                 | File / Module                                   | Details                                                                                                                       | Depends On     |
| --- | -------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 1   | Resume analyzer      | `packages/shared/lib/services/analyzer.ts`      | Orchestrate: load resume → load JD → build prompt → call LLM → parse score + skill breakdown → return `MatchResult`           | P2.2.1, P2.2.2 |
| 2   | Gap analyzer         | `packages/shared/lib/services/gap-analyzer.ts`  | Build gap analysis prompt → call LLM → parse `GapItem[]` with importance ratings → return                                     | P2.2.1, P2.2.2 |
| 3   | Analyze API endpoint | `apps/web/app/api/resume/[id]/analyze/route.ts` | `POST /api/resume/:id/analyze` — accept `{ jobId }`, run analyzer + gap analyzer in parallel, return combined result          | 1, 2           |
| 4   | Score UI component   | `apps/web/components/resume/ScoreGauge.tsx`     | Radial gauge showing 0-100 score with color bands (red < 40, yellow 40-70, green > 70); animated transition                   | P0.4.1         |
| 5   | Gap list UI          | `apps/web/components/resume/GapList.tsx`        | Expandable list of gaps grouped by importance (high/medium/low); each item shows skill name, category badge, suggested action | P0.4.1         |

**Success Criteria**:

- Analysis returns score + skill breakdown + gaps for any valid resume+JD pair
- Score is consistent (+/- 3 points) across repeated analyses of same inputs
- Gap analysis correctly identifies missing skills from JD
- UI components render correctly with both real and mock data

---

#### P2.4 — Tailoring Pipeline

| #   | Task                | File / Module                                  | Details                                                                                                                                                 | Depends On     |
| --- | ------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 1   | Resume tailor       | `packages/shared/lib/services/tailor.ts`       | Orchestrate per-section: extract bullet points → for each bullet, build tailor prompt → call LLM → collect rewritten bullets → assemble tailored resume | P2.2.1, P2.2.2 |
| 2   | Diff engine         | `packages/shared/lib/services/diff.ts`         | Line-by-line diff of original vs tailored text; track changed, added, removed, unchanged lines; generate change reasons summary                         | 1              |
| 3   | Tailor API endpoint | `apps/web/app/api/resume/[id]/tailor/route.ts` | `POST /api/resume/:id/tailor` — accept `{ jobId }`, run tailoring pipeline, return `{ original, tailored, diff, score }`                                | 1, 2           |
| 4   | Tailor UI — trigger | `apps/web/components/resume/TailorButton.tsx`  | "Generate Tailored Resume" button with loading state, estimated time display, cancellation support                                                      | P0.4.1         |
| 5   | Diff viewer UI      | `apps/web/components/resume/DiffViewer.tsx`    | Side-by-side view: original (red) / tailored (green); each changed line shows hover tooltip with change reason; line numbers; scroll sync               | P0.4.1         |

**Success Criteria**:

- Tailored resume preserves all factual information from original
- Diff correctly identifies all changed lines
- Change reasons are meaningful and specific (not generic)
- Diff viewer scrolls both panes in sync
- Tailoring completes within 30s for a standard resume (500-800 words)

---

#### P2.5 — Guardrail System

| #   | Task                  | File / Module                                             | Details                                                                                                                                 | Depends On |
| --- | --------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | Guardrail checker     | `packages/shared/lib/services/guardrails.ts`              | Run all guardrails (truthfulness, fabrication, seniority, consistency) against tailored output; return `{ passed, issues[], severity }` | P2.2.1     |
| 2   | Truthfulness check    | `packages/shared/lib/services/guardrails/truthfulness.ts` | Verify: job titles match original, dates unchanged, metrics within reasonable bounds of original                                        | 1          |
| 3   | Fabrication detection | `packages/shared/lib/services/guardrails/fabrication.ts`  | Check: company names exist in original, project names verifiable, certifications not fabricated                                         | 1          |
| 4   | Seniority check       | `packages/shared/lib/services/guardrails/seniority.ts`    | Validate: no title inflation, experience level matches original years, responsibility level consistent                                  | 1          |
| 5   | Guardrail result UI   | `apps/web/components/resume/GuardrailBadge.tsx`           | Per-section badge: ✅ Pass, ⚠️ Warning, ❌ Fail; expandable detail with explanation                                                     | P0.4.1     |

**Success Criteria**:

- Guardrails catch: inflated job title (e.g., "Junior" → "Senior"), fabricated metric (e.g., "increased revenue by 500%"), made-up company name
- Pass/Fail/Warning decisions are reproducible for same inputs
- All guardrails execute within 10s total
- Any "Fail" result prevents the tailored version from being saved

---

#### P2.6 — PDF Export

| #   | Task               | File / Module                                   | Details                                                                                                               | Depends On                           |
| --- | ------------------ | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ---- |
| 1   | PDF generator      | `packages/shared/lib/pdf/generator.ts`          | Playwright-based: render resume HTML → PDF; handle page breaks, font embedding, multi-page layouts                    | P2.4.1                               |
| 2   | Comparison PDF     | `packages/shared/lib/pdf/comparison.ts`         | Generate comparison report showing original vs tailored side-by-side with score delta, gap summary, guardrail results | 1                                    |
| 3   | PDF export API     | `apps/web/app/api/resume/[id]/export/route.ts`  | `POST /api/resume/:id/export` — accept `{ jobId, type: 'tailored'                                                     | 'comparison' }`, return `{ pdfUrl }` | 1, 2 |
| 4   | Download button UI | `apps/web/components/resume/DownloadButton.tsx` | Download options: "Tailored Resume (.pdf)", "Comparison Report (.pdf)", "Tailored Resume (.docx)" (phase 2)           | P0.4.1                               |

**Success Criteria**:

- PDF renders with consistent styling (fonts, colors, spacing) matching the web preview
- Multi-page resumes handle page breaks correctly (no content cut off)
- Comparison PDF includes: score, gap summary, guardrail results, side-by-side diff
- PDF generation completes within 5s
- File downloads with correct filename format: `Resume_Company_Role_Tailored.pdf`

---

#### P2.7 — Resume Tailor Tests

| #   | Task                      | File / Module                                           | Details                                                                                             | Depends On       |
| --- | ------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------- |
| 1   | Unit tests for parser     | `packages/shared/__tests__/resume/parser.test.ts`       | Test each file format, error cases (corrupt PDF, empty file), section extraction accuracy           | P2.1.2           |
| 2   | Unit tests for LLM client | `packages/shared/__tests__/llm/client.test.ts`          | Mock Groq API; test retry logic, timeout handling, Zod validation failures, circuit breaker         | P2.2.1           |
| 3   | Unit tests for guardrails | `packages/shared/__tests__/services/guardrails.test.ts` | 20+ test cases: all pass, fabrication detected, seniority inflation, multiple issues                | P2.5             |
| 4   | Integration tests for API | `apps/web/__tests__/api/resume.test.ts`                 | Test upload → analyze → tailor → export flow end-to-end with mocks; verify DB state after each step | P2.3, P2.4, P2.6 |
| 5   | LLM snapshot tests        | `packages/shared/__tests__/llm/snapshots.test.ts`       | Record LLM responses and verify schema compliance; alert on schema drift                            | P2.2.1           |

**Success Criteria**:

- 90%+ code coverage across parser, LLM client, and guardrails
- Integration tests cover the full happy path and all error paths
- LLM snapshot tests capture responses for 5+ prompt variants

---

## Phase P3 — The Closer (Cold Email Outreach)

### Goal

Port the existing `cold-email-parser` CLI tool into a FastAPI service with email generation, SMTP delivery, preview engine, and audit logging.

### Tasks

#### P3.1 — Email Generation

| #   | Task                           | File / Module                                | Details                                                                                                                                                                         | Depends On |
| --- | ------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | Email generator                | `services/closer/app/email_generator.py`     | Template-based email generation (MVP); later AI-powered via LLM. Accept `Application` context → render subject + body with personalization                                      | P0.1.2     |
| 2   | Email templates                | `services/closer/app/templates/`             | Jinja2 templates: `cold_email.html`, `cold_email.txt`, `follow_up.html`, `follow_up.txt`; variables: `{{ company }}`, `{{ role }}`, `{{ recipient_name }}`, `{{ sender_name }}` | 1          |
| 3   | Personalization engine         | `services/closer/app/personalizer.py`        | Extract company, role, recipient info from job + application data; build personalized hooks for email opening                                                                   | 1          |
| 4   | LLM email generator (post-MVP) | `services/closer/app/email_generator_llm.py` | AI-powered generation using Llama 3.3 70B; prompt template from `prompts/outreach/cold-email.txt`                                                                               | P2.2.1     |

**Success Criteria**:

- Template generates valid HTML email with correct personalization
- All template variables are filled (no `{{ }}` artifacts in output)
- Plain-text version auto-generated from HTML
- LLM-generated emails are coherent and specific to the target company+role

---

#### P3.2 — SMTP Delivery

| #   | Task                 | File / Module                         | Details                                                                                                                                | Depends On |
| --- | -------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | SMTP sender          | `services/closer/app/email_sender.py` | `smtplib`-based sender; support STARTTLS; configurable host, port, credentials; send with `Message-ID`, `In-Reply-To` for threading    | P3.1.1     |
| 2   | Dry-run mode         | `services/closer/app/email_sender.py` | When `DRY_RUN=true`, log intended send but skip SMTP connection; return simulated success                                              | 1          |
| 3   | Rate limiter         | `services/closer/app/rate_limiter.py` | Token bucket: max 20 emails/hr, 100/day per user; return `429` with `Retry-After` header                                               | 1, P0.4    |
| 4   | Queue-based delivery | `services/closer/app/queue.py`        | Redis-backed queue (Bull/Celery); enqueue send tasks, retry with linear backoff (30s, max 3 retries), circuit breaker after 3 failures | 1          |

**Success Criteria**:

- SMTP successfully sends emails through Gmail, Outlook, and custom SMTP servers
- Dry-run mode logs all sends without network I/O
- Rate limiter correctly rejects over-limit requests with `Retry-After`
- Queue retries failed sends up to 3 times
- Circuit breaker pauses delivery for 5 minutes after 3 consecutive failures

---

#### P3.3 — Preview Engine

| #   | Task                        | File / Module                                   | Details                                                                                                                 | Depends On |
| --- | --------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | Email preview renderer      | `services/closer/app/preview.py`                | Render HTML email as it would appear in Gmail/Outlook; inline CSS, track pixel injection, link validation               | P3.1.1     |
| 2   | Preview API endpoint        | `services/closer/app/routes/outreach.py`        | `POST /api/outreach/:id/preview` — return `{ html, text, subject, links[], estimated_read_time }`                       | 1          |
| 3   | Terminal preview (CLI mode) | `services/closer/cli/preview.py`                | Colorized terminal output: subject, recipient, body (truncated), interactive prompt: [S]end / [D]raft / [S]kip / [E]dit | 1          |
| 4   | Email preview UI            | `apps/web/components/outreach/EmailPreview.tsx` | Iframe rendering of HTML email; toggleable HTML/text view; link preview on hover; "Looks good" / "Edit" buttons         | P0.4.1     |

**Success Criteria**:

- Preview renders HTML email faithfully (CSS inlined, images loaded)
- Track pixel and links are validated before display
- Estimated read time is within 20% of actual reading time
- Inline editing allows modifying subject and body before sending

---

#### P3.4 — Audit Logging

| #   | Task                     | File / Module                             | Details                                                                                                       | Depends On |
| --- | ------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | Outreach logger          | `services/closer/app/logger.py`           | Log every send attempt to `outreach_logs` table: status, timestamp, error, recipient, subject hash            | P0.2.3     |
| 2   | Delivery status tracking | `services/closer/app/delivery_tracker.py` | Track delivery status (sent, failed, bounced, replied); update log on delivery notification                   | 1          |
| 3   | CSV export of logs       | `services/closer/app/export.py`           | `export_logs(userId, format='csv')` — download full outreach history                                          | 1          |
| 4   | Logs API endpoint        | `services/closer/app/routes/outreach.py`  | `GET /api/outreach/logs` — paginated, filterable by status/date; `GET /api/outreach/stats` — aggregated stats | 1          |

**Success Criteria**:

- Every send attempt is logged with unique ID before network I/O
- Delivery status is accurately updated (success, bounce, reply)
- CSV export matches expected format and includes all log entries
- Stats API returns correct counts for sent, opened, replied, bounced

---

#### P3.5 — Outreach Console UI

| #   | Task                 | File / Module                                  | Details                                                                                                     | Depends On |
| --- | -------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | Send queue UI        | `apps/web/components/outreach/SendQueue.tsx`   | List of pending/draft/sent emails; status badges (draft, queued, sent, failed); bulk actions; search/filter | P0.4.1     |
| 2   | Delivery log UI      | `apps/web/components/outreach/DeliveryLog.tsx` | Table view: recipient, subject, sent date, status, delivery status, actions (resend, view details)          | P3.4.4     |
| 3   | Stats cards UI       | `apps/web/components/outreach/StatsCards.tsx`  | Metric cards: total sent, open rate, reply rate, bounce rate; trend indicators (up/down from last week)     | P3.4.4     |
| 4   | Volume cap indicator | `apps/web/components/outreach/VolumeGauge.tsx` | Shows current usage vs daily/hourly limits; warning when approaching cap                                    | P3.2.3     |

**Success Criteria**:

- Send queue shows correct status for each email in real-time
- Delivery log is filterable and sortable by all columns
- Stats cards update within 5s of a new send
- Volume cap indicator turns yellow at 80% and red at 95%

---

#### P3.6 — Outreach Tests

| #   | Task                       | File / Module                                   | Details                                                                         | Depends On |
| --- | -------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------- | ---------- |
| 1   | Unit tests for email gen   | `services/closer/tests/test_email_generator.py` | Test all template variants, personalization edge cases, HTML→text conversion    | P3.1.1     |
| 2   | Unit tests for SMTP sender | `services/closer/tests/test_email_sender.py`    | Mock SMTP server; test dry-run, real send, auth failure, timeout, rate limiting | P3.2       |
| 3   | Integration tests for API  | `services/closer/tests/test_api.py`             | Test generate → preview → send → log flow; verify DB state                      | P3.3, P3.4 |

**Success Criteria**:

- 90%+ code coverage on email generator and SMTP sender
- All send modes (dry-run, draft, send) tested
- Rate limiter tested with concurrent requests

---

## Phase P4 — Integration

### Goal

Connect all three services into a unified platform with a pipeline orchestrator, unified UI, application tracking, and real-time event bus.

### Tasks

#### P4.1 — Pipeline Orchestrator

| #   | Task                 | File / Module                              | Details                                                                                                             | Depends On |
| --- | -------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | Orchestrator service | `services/orchestrator/`                   | TypeScript/Node.js service managing cross-service workflows; state machine per `architecture.md §6.2`               | P0.1.3     |
| 2   | Workflow definitions | `services/orchestrator/workflows/`         | `fullPipeline`: search → select → upload → analyze → tailor → guardrail → outreach; each step is a state transition | 1          |
| 3   | State persistence    | `services/orchestrator/state.ts`           | Save pipeline context to Redis; recover on restart; timeout abandoned pipelines after 24h                           | 1, P0.4    |
| 4   | Error recovery       | `services/orchestrator/recovery.ts`        | Retry failed steps; skip optional steps; notify user of unrecoverable errors                                        | 2          |
| 5   | Orchestrator API     | `services/orchestrator/routes/pipeline.ts` | `POST /api/pipeline/start` → returns `pipelineId` and `currentState`; `GET /api/pipeline/:id` → full context        | 1          |

**Success Criteria**:

- Full pipeline completes: search → apply → tailor → outreach
- Pipeline state survives server restart (persisted in Redis)
- Failure at any step creates a clear error and offers retry
- Abandoned pipelines are cleaned up after 24h TTL

---

#### P4.2 — Event Bus

| #   | Task                | File / Module                        | Details                                                                                                  | Depends On |
| --- | ------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | Redis Pub/Sub setup | `packages/shared/events/bus.ts`      | Wrapper around Redis Pub/Sub; typed event channels; automatic reconnection                               | P0.4       |
| 2   | Event schemas       | `packages/shared/events/schemas.ts`  | TypeScript interfaces for all events from `architecture.md §7.3`                                         | 1          |
| 3   | Event publishers    | Per-service                          | Each service publishes events on completion of key operations (search done, resume tailored, email sent) | 2          |
| 4   | WebSocket adapter   | `apps/web/lib/websocket.ts`          | Subscribe to events relevant to current user; push real-time updates to UI                               | 2          |
| 5   | Analytics consumer  | `services/orchestrator/analytics.ts` | Listen to all events, aggregate metrics, update dashboard stats                                          | 2          |

**Success Criteria**:

- Events propagate with < 500ms latency from publish to consumer
- WebSocket delivers real-time updates to the correct user only
- Connection recovered within 2s on Redis reconnect
- Analytics consumer correctly aggregates all event types

---

#### P4.3 — Unified UI

| #   | Task                    | File / Module                              | Details                                                                                                                                          | Depends On       |
| --- | ----------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| 1   | Job Discovery Dashboard | `apps/web/app/dashboard/page.tsx`          | Search bar, filter panel (location, remote, experience, date posted, sources), job cards list, pagination, save/select actions                   | P1.3, P0.4       |
| 2   | Resume Studio page      | `apps/web/app/dashboard/resume/page.tsx`   | Upload zone → analysis view (score + gaps) → tailoring view (diff viewer) → approve → export                                                     | P2.3, P2.4, P0.4 |
| 3   | Outreach Console page   | `apps/web/app/dashboard/outreach/page.tsx` | Application list → selected app detail → generate email → preview → send → log                                                                   | P3.3, P3.4, P0.4 |
| 4   | Application Tracker     | `apps/web/app/dashboard/tracker/page.tsx`  | Kanban board with columns: Discovered → Analyzed → Tailored → Outreach Sent → Applied → Interview → Offer/Rejected; drag-and-drop status changes | P4.1, P0.4       |
| 5   | Global navigation       | `apps/web/components/layout/Sidebar.tsx`   | Nav items: Dashboard, Resume Studio, Outreach Console, Application Tracker, Settings; active state indicators; collapsed mode                    | P0.4.2           |

**Success Criteria**:

- User can complete the full pipeline from a single dashboard
- Navigation is intuitive and matches standard job portal UX patterns
- Kanban updates in real-time via WebSocket events
- All pages are responsive (mobile, tablet, desktop)

---

#### P4.4 — Application Tracking

| #   | Task                | File / Module                                  | Details                                                                                                                                      | Depends On |
| --- | ------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | Application CRUD    | `packages/shared/lib/services/applications.ts` | Create, read, update, delete applications; status transitions with validation (no skipping stages); timeline event logging                   | P0.2.2     |
| 2   | Application API     | `apps/web/app/api/applications/route.ts`       | `POST /api/applications`, `PATCH /api/applications/:id`, `GET /api/applications`, `GET /api/applications/:id`, `GET /api/applications/stats` | 1          |
| 3   | Stats aggregation   | `packages/shared/lib/services/stats.ts`        | Aggregate: total by status, response rate, avg match score, time in each stage                                                               | 1          |
| 4   | Follow-up scheduler | `services/orchestrator/followups.ts`           | Schedule follow-up reminders: 3 days after outreach, 7 days after no reply, 14 days after application                                        | P4.1       |

**Success Criteria**:

- Status transitions follow valid paths (no skipping "outreach_sent" → "interview")
- Timeline events are recorded for every status change
- Stats are accurate within 1 minute of real-time
- Follow-up reminders are generated on schedule

---

#### P4.5 — Integration Tests

| #   | Task                      | File / Module                | Details                                                                                                                                             | Depends On |
| --- | ------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | End-to-end pipeline test  | `e2e/full-pipeline.spec.ts`  | Playwright test: login → search jobs → select → upload resume → analyze → tailor → approve → generate outreach → preview → send → verify in tracker | P4.1, P4.3 |
| 2   | Multi-user isolation test | `e2e/multi-user.spec.ts`     | Verify User A's data is not visible to User B                                                                                                       | P0.3       |
| 3   | Concurrent pipeline test  | `e2e/concurrent.spec.ts`     | Run two full pipelines simultaneously; verify no state corruption                                                                                   | P4.1       |
| 4   | Error recovery test       | `e2e/error-recovery.spec.ts` | Simulate service failure mid-pipeline; verify recovery on restart                                                                                   | P4.1.4     |

**Success Criteria**:

- Full pipeline E2E test passes consistently (3/3 runs)
- No data leakage between users
- Concurrent pipelines maintain correct state isolation
- Error recovery resumes from last completed step (no data loss)

---

## Phase P5 — Polish

### Goal

Performance optimization, security hardening, UX refinement, and mobile responsiveness.

### Tasks

#### P5.1 — Performance

| #   | Task                         | File / Module                                                                                                           | Details | Depends On |
| --- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------- | ---------- |
| 1   | LLM response caching         | Validate cache hit rate > 60%; optimize key generation; add warm-up for common queries                                  | P2.2.4  |
| 2   | Database query optimization  | Add missing indexes from query profiling; optimize N+1 queries; add query timeout middleware                            | P0.2    |
| 3   | Frontend bundle optimization | Code-split route-based chunks; lazy-load heavy components (DiffViewer, PDF viewer); tree-shake unused Shadcn components | P4.3    |
| 4   | Image and asset optimization | Next.js Image component with WebP; CDN for static assets; lazy-load job cards below the fold                            | P4.3    |
| 5   | API response caching         | Add `Cache-Control` headers to GET endpoints; Redis cache for job listings (1h TTL)                                     | P4.3    |

**Success Criteria**:

- Lighthouse score > 90 for Performance, Accessibility, Best Practices
- API P95 latency < 200ms for non-LLM endpoints
- Bundle size < 200KB (initial JS)
- LLM cache hit rate > 60%

---

#### P5.2 — Security Hardening

| #   | Task                           | File / Module                                                                                                                | Details | Depends On |
| --- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------- | ---------- |
| 1   | Rate limiting on all endpoints | Global middleware; per-user and per-IP buckets; graduated limits (stricter for auth endpoints)                               | P0.1.1  |
| 2   | Input sanitization             | Sanitize all user inputs: strip HTML from text fields, validate file uploads (magic bytes + extension), limit string lengths | P0.1    |
| 3   | PII masking                    | Mask PII in resume text before sending to LLM (phone, email, address, SSN); restore after processing                         | P2.1.2  |
| 4   | CSRF protection                | Double-submit cookie pattern on state-changing endpoints                                                                     | P0.3    |
| 5   | Security headers               | CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy                                                          | P0.1.1  |
| 6   | Dependency audit               | `npm audit`, `pip audit`; automated Dependabot config for weekly updates                                                     | —       |

**Success Criteria**:

- OWASP ZAP scan passes with no high-severity findings
- No PII data appears in LLM request logs
- File upload validation rejects: renamed `.exe`, SVG with script tags, zip bombs
- All security headers present in production response

---

#### P5.3 — UX Refinement

| #   | Task                     | File / Module                                                                                        | Details | Depends On |
| --- | ------------------------ | ---------------------------------------------------------------------------------------------------- | ------- | ---------- |
| 1   | Mobile responsive layout | All pages work on 320px+ screens; touch-friendly targets (min 44px); swipe gestures on kanban        | P4.3    |
| 2   | Empty states             | Custom empty state illustrations for each page: no jobs found, no applications yet, no outreach sent | P4.3    |
| 3   | Loading skeletons        | Replace spinners with content-aware skeleton loaders matching page layout                            | P4.3    |
| 4   | Error pages              | Custom 404, 500 pages with navigation options                                                        | P4.3    |
| 5   | Onboarding flow          | Guided tour for new users: highlight key features, suggest first actions                             | P4.3    |
| 6   | Keyboard shortcuts       | `j/k` navigate jobs, `Ctrl+Enter` send email, `Esc` close modals, `?` show shortcuts                 | P4.3    |

**Success Criteria**:

- All pages pass mobile-first responsive testing
- Zero layout shift on page load (CLS < 0.1)
- Onboarding flow completes in under 60 seconds
- Keyboard shortcuts work consistently across all pages

---

#### P5.4 — Monitoring & Observability

| #   | Task                   | File / Module                                                                                                          | Details | Depends On |
| --- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------- | ---------- |
| 1   | Structured logging     | All services output JSON logs with `requestId`, `userId`, `service`, `duration`                                        | P0.1    |
| 2   | Health check endpoints | `/health` returning DB status, Redis status, LLM status, queue depth; used by K8s liveness/readiness probes            | P0.1    |
| 3   | Metrics export         | Prometheus metrics endpoint at `/metrics`: request count, error count, latency histogram, LLM token count, queue size  | P0.1    |
| 4   | Distributed tracing    | OpenTelemetry instrumentation across all services; trace ID propagated via HTTP headers                                | P4.1    |
| 5   | Alert rules            | Define alert thresholds: LLM error rate > 5% (PagerDuty), SMTP failure rate > 10% (Slack), queue backlog > 100 (Slack) | 3       |

**Success Criteria**:

- JSON logs are parseable and include all required fields
- Health endpoints return correct status for all dependencies
- Prometheus scrapes metrics correctly
- Distributed trace spans connect across service boundaries

---

## Dependency Graph

```
P0 (Foundation)
├── P0.1 — Monorepo Scaffolding
├── P0.2 — Database Schema & Migrations
├── P0.3 — Authentication
├── P0.4 — Shared UI Components
└── P0.5 — CI/CD Pipeline

P1 (Job Harvester) ── depends on P0.1, P0.2
├── P1.1 — Core Pipeline Port
├── P1.2 — Source Adapters
├── P1.3 — REST API Endpoints
├── P1.4 — Export & CSV
└── P1.5 — Harvester Tests

P2 (Resume Tailor) ── depends on P0.1, P0.2, P0.3
├── P2.1 — Resume Parsing & Upload
├── P2.2 — LLM Client & Prompt System
├── P2.3 — Analysis Pipeline
├── P2.4 — Tailoring Pipeline
├── P2.5 — Guardrail System
├── P2.6 — PDF Export
└── P2.7 — Resume Tailor Tests

P3 (The Closer) ── depends on P0.1, P0.2, P0.4
├── P3.1 — Email Generation
├── P3.2 — SMTP Delivery
├── P3.3 — Preview Engine
├── P3.4 — Audit Logging
├── P3.5 — Outreach Console UI
└── P3.6 — Outreach Tests

P4 (Integration) ── depends on P1, P2, P3
├── P4.1 — Pipeline Orchestrator
├── P4.2 — Event Bus
├── P4.3 — Unified UI
├── P4.4 — Application Tracking
└── P4.5 — Integration Tests

P5 (Polish) ── depends on P4
├── P5.1 — Performance
├── P5.2 — Security Hardening
├── P5.3 — UX Refinement
└── P5.4 — Monitoring & Observability
```

---

## File Map (All Phases)

```
C:\Final-Project\
├── .github/workflows/ci.yml
├── apps/
│   └── web/
│       ├── app/
│       │   ├── api/
│       │   │   ├── auth/[...nextauth]/route.ts
│       │   │   ├── jobs/route.ts
│       │   │   ├── resume/
│       │   │   │   ├── upload/route.ts
│       │   │   │   └── [id]/
│       │   │   │       ├── analyze/route.ts
│       │   │   │       ├── tailor/route.ts
│       │   │   │       └── export/route.ts
│       │   │   ├── outreach/
│       │   │   │   ├── generate/route.ts
│       │   │   │   ├── [id]/send/route.ts
│       │   │   │   ├── logs/route.ts
│       │   │   │   └── stats/route.ts
│       │   │   └── applications/route.ts
│       │   ├── dashboard/
│       │   │   ├── page.tsx
│       │   │   ├── resume/page.tsx
│       │   │   ├── outreach/page.tsx
│       │   │   └── tracker/page.tsx
│       │   ├── login/page.tsx
│       │   └── layout.tsx
│       ├── components/
│       │   ├── layout/
│       │   │   ├── AppShell.tsx
│       │   │   ├── Sidebar.tsx
│       │   │   └── Navbar.tsx
│       │   ├── ui/ (Shadcn primitives)
│       │   ├── jobs/
│       │   │   ├── SearchBar.tsx
│       │   │   ├── FilterPanel.tsx
│       │   │   ├── JobCard.tsx
│       │   │   └── SavedJobsPanel.tsx
│       │   ├── resume/
│       │   │   ├── FileUploader.tsx
│       │   │   ├── ResumePreview.tsx
│       │   │   ├── ScoreGauge.tsx
│       │   │   ├── GapList.tsx
│       │   │   ├── DiffViewer.tsx
│       │   │   ├── GuardrailBadge.tsx
│       │   │   ├── TailorButton.tsx
│       │   │   └── DownloadButton.tsx
│       │   ├── outreach/
│       │   │   ├── EmailPreview.tsx
│       │   │   ├── SendQueue.tsx
│       │   │   ├── DeliveryLog.tsx
│       │   │   ├── StatsCards.tsx
│       │   │   └── VolumeGauge.tsx
│       │   └── tracker/
│       │       ├── KanbanBoard.tsx
│       │       ├── StatusBadge.tsx
│       │       └── MetricCards.tsx
│       ├── lib/websocket.ts
│       └── middleware.ts
├── packages/
│   └── shared/
│       ├── auth/session.ts
│       ├── db/
│       │   ├── migrations/001_init.sql
│       │   ├── schema.ts
│       │   └── seed.ts
│       ├── events/
│       │   ├── bus.ts
│       │   └── schemas.ts
│       ├── lib/
│       │   ├── llm/
│       │   │   ├── client.ts
│       │   │   ├── prompts.ts
│       │   │   ├── cache.ts
│       │   │   ├── config.ts
│       │   │   └── mock.ts
│       │   ├── services/
│       │   │   ├── analyzer.ts
│       │   │   ├── gap-analyzer.ts
│       │   │   ├── tailor.ts
│       │   │   ├── diff.ts
│       │   │   ├── guardrails.ts
│       │   │   │   ├── truthfulness.ts
│       │   │   │   ├── fabrication.ts
│       │   │   │   └── seniority.ts
│       │   │   └── applications.ts
│       │   ├── resume/
│       │   │   └── parser.ts
│       │   └── pdf/
│       │       ├── generator.ts
│       │       └── comparison.ts
│       └── __tests__/
│           ├── llm/
│           ├── resume/
│           └── services/
├── prompts/
│   ├── resume/
│   │   ├── analyze.txt
│   │   ├── tailor.txt
│   │   ├── tailor-explain.txt
│   │   └── gaps.txt
│   ├── guardrails/
│   │   ├── truthfulness.txt
│   │   ├── seniority.txt
│   │   └── metrics.txt
│   ├── outreach/
│   │   ├── cold-email.txt
│   │   └── follow-up.txt
│   └── system/
│       ├── default.txt
│       └── formats.md
├── services/
│   ├── harvester/
│   │   ├── app/
│   │   │   ├── __init__.py
│   │   │   ├── config.py
│   │   │   ├── models.py
│   │   │   ├── pipeline.py
│   │   │   ├── normalizer.py
│   │   │   ├── dedup.py
│   │   │   ├── filter.py
│   │   │   ├── store.py
│   │   │   ├── main.py
│   │   │   ├── adapters/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── base.py
│   │   │   │   ├── naukri.py
│   │   │   │   ├── remoteok.py
│   │   │   │   └── wellfound.py
│   │   │   ├── exporters/
│   │   │   │   ├── csv.py
│   │   │   │   └── application.py
│   │   │   ├── routes/
│   │   │   │   ├── jobs.py
│   │   │   │   └── export.py
│   │   │   └── middleware/
│   │   │       └── error_handler.py
│   │   ├── tests/
│   │   │   ├── test_normalizer.py
│   │   │   ├── test_dedup.py
│   │   │   ├── test_filter.py
│   │   │   ├── test_api.py
│   │   │   └── mock_data/
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   ├── closer/
│   │   ├── app/
│   │   │   ├── __init__.py
│   │   │   ├── config.py
│   │   │   ├── email_generator.py
│   │   │   ├── email_generator_llm.py
│   │   │   ├── email_sender.py
│   │   │   ├── personalizer.py
│   │   │   ├── preview.py
│   │   │   ├── rate_limiter.py
│   │   │   ├── queue.py
│   │   │   ├── logger.py
│   │   │   ├── delivery_tracker.py
│   │   │   ├── export.py
│   │   │   ├── main.py
│   │   │   ├── templates/
│   │   │   │   ├── cold_email.html
│   │   │   │   ├── cold_email.txt
│   │   │   │   ├── follow_up.html
│   │   │   │   └── follow_up.txt
│   │   │   └── routes/
│   │   │       └── outreach.py
│   │   ├── cli/
│   │   │   ├── main.py
│   │   │   └── preview.py
│   │   ├── tests/
│   │   │   ├── test_email_generator.py
│   │   │   ├── test_email_sender.py
│   │   │   └── test_api.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   └── orchestrator/
│       ├── workflows/
│       │   └── full-pipeline.ts
│       ├── state.ts
│       ├── recovery.ts
│       ├── analytics.ts
│       ├── routes/pipeline.ts
│       └── Dockerfile
├── e2e/
│   ├── full-pipeline.spec.ts
│   ├── multi-user.spec.ts
│   ├── concurrent.spec.ts
│   └── error-recovery.spec.ts
├── docker-compose.yml
├── turbo.json
├── package.json
├── .env.example
└── README.md
```

---

## Key Design Decisions

| Decision                               | Rationale                                                                         | Reversible?                                 |
| -------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------- |
| **BFF pattern** for Next.js API routes | Single frontend-domain for all client calls; shields client from service topology | Yes — can add a dedicated API gateway later |
| **Python for Harvester & Closer**      | Reuse existing code from both projects; Selenium/pandas/smtplib ecosystem         | No — would require full rewrite             |
| **TypeScript for Resume Tailor**       | Tight integration with Next.js frontend; PDF generation via Playwright            | Partial — LLM client is portable            |
| **Redis-based event bus (not Kafka)**  | Low-volume, low-latency requirements; simpler ops; already need Redis for cache   | Yes — can swap for Kafka later              |
| **Template-first outreach (MVP)**      | AI-generated emails need guardrails; template-first = safer, simpler              | Yes — add LLM as phase 2                    |
| **sessionStorage for resume data**     | No server-side PII storage; auto-clears on close                                  | Yes — add server-side storage if needed     |
| **Bull/Celery for queues**             | Fits Redis dependency; simple job model for scraping/sending                      | Yes — can swap for SQS/RabbitMQ             |
