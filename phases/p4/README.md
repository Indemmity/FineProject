# Phase P4 — Integration & Pipeline Orchestrator

**Goal:** Connect all three services into a unified platform with a pipeline orchestrator, unified UI, application tracking, and real-time event bus.

## Status

**Complete.** All P4 tasks are implemented across 5 sub-tasks.

## Contents

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

## P4.1 — Pipeline Orchestrator
- **State machine** — 12 states (`idle` → `searching_jobs` → ... → `completed`/`failed`) with valid transition matrix
- **REST API** — `POST /start`, `GET /:id`, `POST /:id/transition`, `GET /`
- **Workflow** — 7-step pipeline: search → upload → analyze → tailor → guardrail → generate → send
- **State persistence** — `persistState()`, `recoverOnRestart()`, `cleanupAbandoned()` (24h TTL)
- **Error recovery** — `recoverPipeline()` with max 3 retries, user-friendly error messages

## P4.2 — Event Bus
- `packages/shared/events/bus.ts` — Typed Pub/Sub with in-memory backend (Redis-ready)
- `packages/shared/events/schemas.ts` — 11 typed event interfaces (harvester, resume, outreach, pipeline)
- `apps/web/lib/websocket.ts` — Client-side WebSocket adapter with subscription management
- `orchestrator/src/analytics.ts` — Listens to all events, aggregates dashboard stats

## P4.3 — Unified UI
- **Dashboard** (`/dashboard/page.tsx`) — Stats cards (Jobs Discovered, Applications, Outreach Sent)
- **Resume Studio** (`/dashboard/resume/page.tsx`) — Upload zone, quick actions, activity log
- **Outreach Console** (`/dashboard/outreach/page.tsx`) — Stats cards, send queue, delivery log
- **Application Tracker** (`/dashboard/tracker/page.tsx`) — 9-column Kanban board with metric cards
- **Tracker components** — `KanbanBoard` (drag-and-drop), `StatusBadge` (color-coded), `MetricCards`

## P4.4 — Application Tracking
- `packages/shared/lib/services/applications.ts` — CRUD with status transition validation + timeline events
- `apps/web/app/api/applications/route.ts` — REST API (GET, POST, PATCH, DELETE)
- `packages/shared/lib/services/stats.ts` — Dashboard stats aggregation
- `orchestrator/src/followups.ts` — Follow-up reminders (3d, 7d, 14d after outreach)

## P4.5 — Integration Tests
- `e2e/full-pipeline.spec.ts` — 14 test cases covering the full pipeline
- `e2e/multi-user.spec.ts` — Multi-user isolation test
- `e2e/concurrent.spec.ts` — Concurrent pipeline test
- `e2e/error-recovery.spec.ts` — Error recovery test

## Quick Start

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

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/api/pipeline/start` | Create and start a new pipeline |
| GET | `/api/pipeline/` | List all pipelines |
| GET | `/api/pipeline/:id` | Get pipeline context |
| POST | `/api/pipeline/:id/transition` | Move pipeline to next state |

## Depends On

- **P1** — Job Harvester API (for job search step)
- **P2** — Resume Tailor API (for analyze/tailor/guardrail steps)
- **P3** — The Closer API (for outreach steps)