# Phase P0 — Foundation

**Goal:** Monorepo scaffolding, database schema, authentication, CI/CD, shared UI components.

## Contents

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

## Key Commands

```bash
# From project root
npm run dev          # Start dev servers
npm run build        # Build all workspaces  
npm run db:migrate   # Apply DB migrations
npm run db:seed      # Seed demo data

# From phases/p0/
docker compose up    # Start PostgreSQL, Redis, and web app
```

## Status

**Complete.** All P0 tasks are implemented:
- Monorepo scaffolding (Next.js, FastAPI, Turborepo, shared packages)
- Database schema & migrations (PostgreSQL, Drizzle ORM, SQLAlchemy)
- Authentication (NextAuth.js with magic link, OAuth, JWT sessions)
- Shared UI components (Shadcn: Button, Card, Badge, Input, Dialog, Tabs, Sonner, Skeleton, ErrorBoundary)
- CI/CD (GitHub Actions, Docker setup, Vitest/pytest config, Vercel deployment config)

## Depends On

Nothing — this is the foundation phase.