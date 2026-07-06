# Phase P3 — The Closer (Cold Email Outreach)

**Goal:** Cold email generation, preview, SMTP delivery, and audit logging.

## Status

**Complete.** All P3 tasks are implemented across 6 sub-tasks.

### P3.1 — Email Generation
- `app/email_generator.py` — Jinja2 template-based email generation (cold + follow-up)
- `app/personalizer.py` — Personalisation context builder with company insight, resume highlights, intro/body/closing renderers
- `app/email_generator_llm.py` — LLM-powered generation placeholder (post-MVP, delegates to template generator)
- `app/templates/` — 4 templates: `cold_email.html`, `cold_email.txt`, `follow_up.html`, `follow_up.txt`

### P3.2 — SMTP Delivery
- `app/email_sender.py` — `smtplib`-based sender with STARTTLS, `Message-ID`/`In-Reply-To` headers, dry-run mode
- `app/rate_limiter.py` — Token bucket rate limiter (20/hr, 100/day per user) with `Retry-After` headers
- `app/queue.py` — In-memory queue with retry (linear backoff 30s→60s→120s), circuit breaker (3 failures → 5min pause)

### P3.3 — Preview Engine
- `app/preview.py` — HTML email renderer with link extraction and read time estimation
- `cli/main.py` — Terminal CLI with preview/send workflows and interactive prompt
- `cli/preview.py` — Colorized terminal email preview
- `apps/web/components/outreach/EmailPreview.tsx` — Iframe HTML preview with toggleable text view, "Looks Good"/"Edit" buttons

### P3.4 — Audit Logging
- `app/logger.py` — In-memory outreach logger with per-user indexing, stats aggregation (open/reply/bounce rates)
- `app/delivery_tracker.py` — Delivery event tracking (delivered, bounced, opened, replied)
- `app/export.py` — CSV export of outreach logs
- `routes/outreach.py` — 8 endpoints (generate, preview, send, queue, logs, stats, track, export)

### P3.5 — Outreach Console UI
- `apps/web/components/outreach/SendQueue.tsx` — List with status badges, search/filter, send/delete actions
- `apps/web/components/outreach/DeliveryLog.tsx` — Sortable table with recipient, subject, date, status, resend
- `apps/web/components/outreach/StatsCards.tsx` — 4 metric cards (total sent, open rate, reply rate, bounce rate)
- `apps/web/components/outreach/VolumeGauge.tsx` — Hourly/daily cap progress bars (yellow at 80%, red at 95%)

### P3.6 — Tests (22 passing)
- `tests/test_email_generator.py` — Template rendering, personalisation, edge cases (7 tests)
- `tests/test_email_sender.py` — Rate limiter (hourly/daily/user isolation/reset), dry-run, SMTP failure (8 tests)
- `tests/test_api.py` — All 8 endpoints tested with mock data (7 tests)

## Quick Start

```bash
cd phases/p3/closer
pip install -r requirements.txt
python -m pytest tests/ -v          # 22 tests
uvicorn app.main:app --reload --port 8002  # FastAPI on :8002
```

## CLI Usage

```bash
# Preview a cold email
python -m cli.main preview --company "TechCorp" --role "Engineer" --name "Jane"

# Send an email (interactive)
python -m cli.main send --email "jane@techcorp.com" --company "TechCorp"
```

## API Endpoints

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

## Depends On

- **P0** — SMTP config, rate limiting defaults, UI components