# Phase P2 — Resume Tailor Service

**Goal:** AI-powered resume analysis, tailoring, guardrails, and PDF export.

## Status

**Complete.** All P2 tasks are implemented across 7 sub-tasks.

### P2.1 — Resume Parsing & Upload
- `packages/shared/lib/resume/parser.ts` — PDF/DOCX/TXT parser with section extraction (education, experience, skills, etc.)
- `apps/web/app/api/resume/upload/route.ts` — File upload API (multipart, 10 MB limit, type validation)
- `apps/web/app/api/resume/store.ts` — In-memory resume storage with CRUD operations
- `apps/web/components/resume/FileUploader.tsx` — Drag-and-drop upload UI with progress bar

### P2.2 — LLM Client & Prompt System
- `packages/shared/lib/llm/client.ts` — Groq SDK wrapper with retry (3 attempts, exponential backoff), timeout (30s), circuit breaker (5 failures/60s window)
- `packages/shared/lib/llm/config.ts` — Env-based config with Zod validation (`GROQ_API_KEY`, `LLM_MODEL`, etc.)
- `packages/shared/lib/llm/prompts.ts` — Prompt template loader with variable interpolation and caching
- `packages/shared/lib/llm/cache.ts` — In-memory cache with TTL, pattern invalidation
- `packages/shared/lib/llm/mock.ts` — Deterministic mock responses for UI dev (auto-enabled when `MOCK_MODE=true`)
- `prompts/resume/analyze.txt` — Analysis prompt template
- `prompts/resume/tailor.txt` — Tailoring prompt template
- `prompts/resume/gaps.txt` — Gap analysis prompt template
- `prompts/guardrails/truthfulness.txt` — Guardrail verification prompt

### P2.3 — Analysis Pipeline
- `packages/shared/lib/services/analyzer.ts` — Resume analyzer (score 0-100, skill breakdown, strengths/weaknesses)
- `packages/shared/lib/services/gap-analyzer.ts` — Gap analysis with importance ratings
- `apps/web/app/api/resume/[id]/analyze/route.ts` — `POST /api/resume/:id/analyze` endpoint
- `apps/web/components/resume/ScoreGauge.tsx` — Animated radial gauge (red < 40, yellow 40-70, green > 70)
- `apps/web/components/resume/GapList.tsx` — Expandable gap list grouped by importance

### P2.4 — Tailoring Pipeline
- `packages/shared/lib/services/tailor.ts` — Per-section bullet rewriting via LLM
- `packages/shared/lib/services/diff.ts` — Line-by-line diff engine (added, removed, modified, unchanged)
- `apps/web/app/api/resume/[id]/tailor/route.ts` — `POST /api/resume/:id/tailor` endpoint
- `apps/web/components/resume/TailorButton.tsx` — "Generate Tailored Resume" button with ETA display
- `apps/web/components/resume/DiffViewer.tsx` — Side-by-side and unified diff views with color coding

### P2.5 — Guardrail System
- `packages/shared/lib/services/guardrails.ts` — LLM-based guardrail checker (truthfulness, fabrication, seniority)
- `packages/shared/lib/services/guardrails/truthfulness.ts` — Title inflation and metric fabrication detection
- `packages/shared/lib/services/guardrails/fabrication.ts` — Company name, certification, and degree fabrication detection
- `packages/shared/lib/services/guardrails/seniority.ts` — Seniority level and years of experience validation
- `apps/web/components/resume/GuardrailBadge.tsx` — Pass/Warning/Fail badge with expandable details

### P2.6 — PDF Export
- `packages/shared/lib/pdf/generator.ts` — HTML-to-PDF generation with styled output
- `packages/shared/lib/pdf/comparison.ts` — Comparison report (score, gaps, guardrails, side-by-side)
- `apps/web/app/api/resume/[id]/export/route.ts` — `POST /api/resume/:id/export` endpoint
- `apps/web/components/resume/DownloadButton.tsx` — Download buttons for tailored PDF and comparison report

### P2.7 — Tests (23 passing)
- `packages/shared/__tests__/resume/parser.test.ts` — Section extraction, TXT parsing, edge cases
- `packages/shared/__tests__/llm/client.test.ts` — Cache operations, TTL, key hashing, pattern invalidation
- `packages/shared/__tests__/services/guardrails.test.ts` — Title inflation, metric fabrication, company/degree fabrication, seniority/experience inflation
- `packages/shared/__tests__/services/diff.test.ts` — Change detection, added/removed/modified lines, change counting

## Quick Start

```bash
# Ensure deps are installed
cd phases/p0 && npm install

# Run tests
cd phases/p0 && npx vitest run --config vitest.config.ts

# Start the web app (which includes resume API routes)
cd phases/p0 && npm run dev
```

## Key Dependencies Added

- **groq-sdk** — LLM API client (shared package)
- **mammoth** — DOCX text extraction (web app)
- **pdf-parse** — PDF text extraction (web app)

## Depends On

- **P0** — Database schema, auth, UI components, shared types