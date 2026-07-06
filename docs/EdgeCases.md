# Edge Cases & Failure Modes Reference

> **Audience**: Developers implementing each phase.  
> **Purpose**: Consult during coding to ensure edge cases are handled.  
> **Organization**: Mirrors the phase/sub-phase structure of `implementationPlan.md`.

---

## Phase P0 — Foundation

### P0.1 — Monorepo Scaffolding

| #   | Edge Case                                                                                        | Expected Behavior                                                                                                                        | Check               |
| --- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1   | **Port conflicts** — `:3000` or `:8001` already in use                                           | Service should fail gracefully with a clear error message including the port number and `lsof` hint                                      | On startup          |
| 2   | **Node.js version mismatch** — Developer running Node 18 on a project requiring 20+              | `engines` field in `package.json` should cause `npm install` to warn/block; Next.js should log explicit version requirement on dev start | `npm install`       |
| 3   | **Python version mismatch** — Python 3.9 installed, 3.11 required                                | FastAPI import errors should include a version-gate message: "Python 3.11+ required. Found 3.9.x"                                        | Import time         |
| 4   | **Missing system dependencies** — `playwright` chromium not installed, `selenium` driver missing | Playwright: logged error with install command (`npx playwright install chromium`). Selenium: logged error linking to ChromeDriver docs   | Service startup     |
| 5   | **Turborepo cache corruption** — Stale cache causing false build successes                       | Full `--force` builds should be possible via `turbo build --force`; cache should be invalidatable per-package                            | CI / dev            |
| 6   | **Platform-specific path separators** — Windows `\\` vs Unix `/`                                 | All path operations must use `path.join()` / `path.resolve()`; `.env` file loading must tolerate CRLF vs LF                              | Cross-platform test |
| 7   | **Empty `.env.example`** — Missing required variables documented only in code                    | A startup-time validation should enumerate missing vars and abort with the complete list                                                 | Service boot        |

---

### P0.2 — Database Schema & Migrations

| #   | Edge Case                                                                                         | Expected Behavior                                                                                                                                                                       | Check            |
| --- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 1   | **Concurrent migration run** — Two instances attempt migration simultaneously                     | Use advisory locks or `SKIP LOCKED` to prevent double-migration; second runner should wait and then skip                                                                                | Deployment       |
| 2   | **Migration rollback after partial failure** — 5 of 10 statements executed before crash           | All DDL should be wrapped in a transaction; rollback restores prior state completely                                                                                                    | Migration runner |
| 3   | **Schema drift** — Drizzle and SQLAlchemy models disagree on a column type                        | A CI step should compare generated SQL from both ORMs and fail on mismatch                                                                                                              | CI               |
| 4   | **Extremely long job descriptions** — `description` text > 10,000 words                           | `TEXT` column has no practical limit; validate at API layer (< 100KB for a single JD) to avoid OOM on LLM calls                                                                         | API + DB         |
| 5   | **Unicode in company names** — Japanese, Arabic, or emoji characters                              | All text columns should be `UTF8`; no `ascii`-only assumptions in validation                                                                                                            | DB + normalizer  |
| 6   | **NULL in nullable columns** — Salary, location, company missing from source                      | Store as `NULL`; frontend must handle "Not specified" display; filters must treat `NULL` correctly (e.g., location filter should include null-location jobs unless explicitly excluded) | Normalizer + UI  |
| 7   | **Duplicate email in users** — Unique constraint violation on `users.email`                       | Return 409 with "An account with this email already exists"                                                                                                                             | Auth             |
| 8   | **Race condition on upsert** — Two concurrent scrapes insert same job (same `source + source_id`) | Use `ON CONFLICT (source, source_id) DO UPDATE`; no duplicate rows                                                                                                                      | Job store        |
| 9   | **Clock skew** — `posted_date` in the future due to source TZ bug                                 | Clamp future dates to `scraped_at`; log warning with source name                                                                                                                        | Normalizer       |
| 10  | **Extremely large batch insert** — 10,000 jobs in one scraped response                            | Batch inserts should be chunked (500 per chunk); monitor queue depth                                                                                                                    | Job store        |

---

### P0.3 — Authentication

| #   | Edge Case                                                                             | Expected Behavior                                                                                                                   | Check           |
| --- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| 1   | **Expired JWT mid-request** — Token expires between request initiation and processing | Middleware should not reject; expiry is checked at request start, token is valid for the duration                                   | Middleware      |
| 2   | **Revoked session** — User logs out, then reuses old token                            | Blacklist token `jti` in Redis; check blacklist on every authenticated request                                                      | Auth middleware |
| 3   | **Magic link double-use** — User clicks the same magic link twice                     | First click creates session; second click should either redirect to dashboard (if session still valid) or show "Link expired" error | Auth            |
| 4   | **Magic link expiry during form fill** — User opens link 2 hours later                | Link TTL is 15 minutes; expired links show clear message with "Send new link" button                                                | Auth UI         |
| 5   | **OAuth email mismatch** — GitHub email differs from Google email for same user       | Link by email as primary key; if email exists, link new provider; if email different, create new account                            | OAuth           |
| 6   | **OAuth provider down** — Google/GitHub rate-limit or outage                          | Show non-blocking error toast; keep email + magic link as fallback                                                                  | Login page      |
| 7   | **Session cookie theft** — XSS or MITM steals HTTP-only cookie                        | `SameSite=Strict`, `Secure` flag, short session TTL (24h); sensitive actions (email send) require re-auth                           | Cookie config   |
| 8   | **Multiple tabs with staggered logout** — Tab A logs out, Tab B continues working     | Session is invalidated on server; Tab B's next API call gets 401 → redirect to login                                                | Auth middleware |
| 9   | **Rate-limit on magic link** — User clicks "send link" 50 times                       | Max 3 requests per minute per email; show "Check your email. Next link available in X seconds"                                      | Auth API        |
| 10  | **Empty email submission** — User submits login form with blank email                 | Client-side validation before submit; server-side double-check returning 422                                                        | Login form      |

---

### P0.4 — Shared UI Components

| #   | Edge Case                                                                         | Expected Behavior                                                                                                 | Check         |
| --- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------- |
| 1   | **Extremely long text in badge/breadcrumb** — 200-character company name          | Truncate with ellipsis (`text-overflow: ellipsis`, `max-width`); tooltip on hover shows full text                 | All UI        |
| 2   | **Rapid toast stacking** — 20 errors in 1 second                                  | Queue limit of 5 visible toasts; older ones auto-dismiss; "X more errors" summary                                 | Toast system  |
| 3   | **Browser back/forward with modal open** — User navigates while dialog is visible | Close modal; or use `router.push` with a query param representing modal state                                     | Modal system  |
| 4   | **Resize during animation** — Window resized mid-transition                       | CSS animations should use `transform` + `opacity` (GPU-composited); no layout-triggering properties mid-animation | CSS           |
| 5   | **Reduced motion preference** — User has `prefers-reduced-motion: reduce`         | All animations should respect this media query; fall back to instant transitions                                  | CSS / JS      |
| 6   | **Touch vs click double-fire** — Mobile tap fires both `touchstart` and `click`   | Use `pointerdown` or ensure `e.preventDefault()` on touch events; no double-handlers                              | Interaction   |
| 7   | **Tab visibility change** — User switches away during long operation              | Pause polling when `document.hidden`; resume on `visibilitychange`; no unnecessary network calls                  | Polling hooks |
| 8   | **Offline mode** — User loses connectivity during form fill                       | Detect `navigator.onLine`; show offline indicator; queue API calls; retry on reconnect                            | Network layer |
| 9   | **Screen reader with skeleton loader** — `aria-busy` not set                      | Skeleton containers must have `aria-busy="true"`; when content loads, set `aria-busy="false"` and `role="status"` | Skeleton      |

---

### P0.5 — CI/CD Pipeline

| #   | Edge Case                                                                           | Expected Behavior                                                                                   | Check       |
| --- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------- |
| 1   | **Flaky test in CI** — Test passes locally but fails in CI 30% of the time          | CI should retry flaky tests once; track flake rate; tag tests with `@flaky` for investigation       | CI config   |
| 2   | **Docker build cache miss** — All layers rebuilt from scratch on every push         | Layer order: `package.json` → `npm install` → source code; lockfile changes invalidate deps layer   | Dockerfile  |
| 3   | **Secret leak in build logs** — `DATABASE_URL` printed in CI output                 | All secrets should be GitHub Actions secrets masked in logs; never `echo` secrets                   | CI security |
| 4   | **Concurrent deployments to same env** — Two PRs merge before first deploy finishes | Queue deploys; second deploy waits for first to complete; use `concurrency` group in GitHub Actions | CI/CD       |
| 5   | **Disk space exhaustion in CI** — Node modules + Playwright browsers take > 15GB    | Clean cache between runs; use `actions/cache` with smart key invalidation; monitor free space       | CI          |

---

## Phase P1 — Job Harvester Service

### P1.1 — Core Pipeline Port

| #   | Edge Case                                                                                                | Expected Behavior                                                                                                              | Check           |
| --- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| 1   | **All sources return 0 jobs** — No results for the search term                                           | Return empty results array, not an error. Frontend shows "No jobs found. Try broader keywords"                                 | Pipeline        |
| 2   | **One source fails, others succeed** — Naukri timeout, RemoteOK returns results                          | Pipeline should not abort on partial failure; log per-source error; return successful results with `partialResults: true` flag | Pipeline        |
| 3   | **Pipeline called with empty keyword** — No search term provided                                         | Return 422 validation error: "At least one keyword is required"                                                                | API + pipeline  |
| 4   | **100% exact duplicates from same source** — Same job appears on two pages of same source                | Dedup by `source + source_id` catches this at upsert time                                                                      | Dedup           |
| 5   | **Nearly identical but different jobs** — Two postings for same company, same title, different locations | Fuzzy match threshold should allow this; locations differ → distinct jobs                                                      | Dedup           |
| 6   | **Search keyword not in title but in description** — "Python" search matches "Senior Engineer (Python)"  | Relevance filter should check both title and description; configurable weight                                                  | Filter          |
| 7   | **Salary in non-standard format** — "Competitive", "DOE", "₹12L", "15-20 lacs"                           | Normalizer should recognize common patterns; unknown formats stored as `null` with raw text in `raw` JSONB                     | Normalizer      |
| 8   | **Date in relative format** — "Posted 2 days ago", "Updated yesterday", "30+ days ago"                   | Parse relative dates relative to scrape timestamp; clamp to `scraped_at` if beyond reasonable bounds                           | Normalizer      |
| 9   | **Missing company name** — RemoteOK listings sometimes omit company                                      | Store as `null`; frontend shows "Unknown Company"                                                                              | Normalizer      |
| 10  | **Job type not specified** — Source doesn't differentiate FT/PT/Contract                                 | Default to `null`; frontend shows "Not specified" badge                                                                        | Normalizer + UI |

---

### P1.2 — Source Adapters

| #   | Edge Case                                                                         | Expected Behavior                                                                                | Check             |
| --- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------- |
| 1   | **Naukri — CAPTCHA challenge** — Selenium detects bot protection                  | Log warning, skip Naukri for this session, return partial results; retry on next scheduled run   | Naukri adapter    |
| 2   | **Naukri — Cookie consent modal blocking content** — GDPR/CCPA popup              | Selenium adapter must handle common popup patterns: accept cookies, close modal, or dismiss      | Naukri adapter    |
| 3   | **Naukri — Pagination beyond 50 pages** — Results span 200+ pages                 | Cap pagination at 50 pages (conservative); log warning if results are truncated                  | Naukri adapter    |
| 4   | **RemoteOK — API rate limit** — 429 response                                      | Respect `Retry-After` header; back off and retry once; skip if second attempt also fails         | RemoteOK adapter  |
| 5   | **RemoteOK — API schema change** — New field added or field renamed               | Zod validation catches schema drift; log warning with diff; return partial data for known fields | RemoteOK adapter  |
| 6   | **Wellfound — Search URL changes** — URL structure updated by site                | Adapter should fail with clear error; log the full URL that failed; easy to update in config     | Wellfound adapter |
| 7   | **Wellfound — Firecrawl credit exhausted** — API key out of requests              | Log credit status; skip Wellfound; return partial results                                        | Wellfound adapter |
| 8   | **Source returns HTML instead of JSON** — API endpoint changed to serve web page  | Response content-type check; if HTML detected when JSON expected, fail with descriptive error    | All adapters      |
| 9   | **Malformed HTML** — Unclosed tags, broken structure from Selenium                | Use BeautifulSoup's forgiving parser; extract what's possible; log parsing warnings              | Naukri adapter    |
| 10  | **Encoding issues** — Latin-1 encoded page read as UTF-8                          | Detect encoding from `Content-Type` header or `<meta charset>`; fall back to `chardet` detection | All adapters      |
| 11  | **Adapter registration conflict** — Two adapters registered with same source name | Factory should throw on duplicate registration; log error with both module paths                 | Adapter factory   |

---

### P1.3 — REST API Endpoints

| #   | Edge Case                                                                    | Expected Behavior                                                                | Check      |
| --- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------- |
| 1   | **Search endpoint called during ongoing search** — Same keywords fired twice | Return existing `searchId` instead of starting duplicate; or cancel-and-restart  | Search     |
| 2   | **Polling before search complete** — Client polls every 100ms                | Endpoint should return immediately with current status; no long-held connections | Poll       |
| 3   | **Poll for expired searchId** — `searchId` older than 1 hour                 | Return 410 Gone with message "Search results expired. Please run a new search"   | Poll       |
| 4   | **DELETE while pipeline is running** — User removes a job being processed    | Return 409 Conflict with message "Job is currently being processed"              | DELETE     |
| 5   | **Batch search with 100 keywords** — Extreme input size                      | Cap at 10 keywords per request; return 422 if exceeded                           | Batch      |
| 6   | **Invalid source name** — `sources: ["naukri", "nonexistent"]`               | Return 422 listing invalid sources; suggest valid ones                           | Sources    |
| 7   | **XSS in search keyword** — `<script>alert('xss')</script>`                  | Sanitize input; store sanitized version; no raw HTML anywhere in output          | Search     |
| 8   | **Extremely long search keyword** — 10,000 characters                        | Reject with 422: "Keyword must be under 200 characters"                          | Validation |

---

### P1.4 — Export & CSV

| #   | Edge Case                                                             | Expected Behavior                                                                  | Check      |
| --- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------- |
| 1   | **CSV contains commas in fields** — Company name "Acme, Inc."         | Proper CSV quoting (`"Acme, Inc."`); use `csv.writer` with `quoting=csv.QUOTE_ALL` | CSV export |
| 2   | **CSV contains newlines in description** — Multi-line job description | Escape or strip newlines from single cell; or keep but quote properly              | CSV export |
| 3   | **Export with no searchId** — Missing parameter                       | Return 422: "searchId is required"                                                 | Export     |
| 4   | **Empty export** — No jobs found for the search                       | Return empty CSV with only headers, not an error                                   | Export     |
| 5   | **Export to application with no userId** — Missing auth context       | Return 401; every application must be tied to a user                               | Export     |
| 6   | **Concurrent export requests** — Same searchId exported twice         | Both should succeed; export is idempotent (reads from stored data, doesn't mutate) | Export     |

---

### P1.5 — Harvester Tests

| #   | Edge Case                                                                                                | Expected Behavior                                                                                           | Check           |
| --- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------- |
| 1   | **Salary with multiple currencies** — "$100k" and "₹12L" in same batch                                   | Normalizer should handle independently; not conflate different currency formats                             | Normalizer test |
| 2   | **Fuzzy match false positive** — "Software Engineer" and "Software Engineer Intern" matched as duplicate | Similarity threshold must be high enough (0.85+) to distinguish these; title + seniority level check        | Dedup test      |
| 3   | **Fuzzy match false negative** — "Sr. Software Engineer" and "Senior Software Engineer" not matched      | Similarity normalization: strip punctuation, standardize abbreviations ("Sr." → "Senior") before comparison | Dedup test      |
| 4   | **Mock data with special characters** — Company names containing `&`, `/`, `@`, emoji                    | Normalizer should preserve them; CSV should quote them                                                      | Mock data       |

---

## Phase P2 — Resume Tailor Service

### P2.1 — Resume Parsing & Upload

| #   | Edge Case                                                                | Expected Behavior                                                                                                              | Check            |
| --- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| 1   | **Password-protected PDF** — User uploads encrypted document             | Detect encryption header; reject with "PDF is password protected. Please remove protection and try again"                      | Parser           |
| 2   | **Scanned PDF (image-only)** — No selectable text                        | Detect zero extracted characters; show warning "No text found. Scanned PDFs are not supported. Please upload a text-based PDF" | Parser           |
| 3   | **Corrupt file** — Truncated PDF, broken DOCX                            | Catch parsing exception; return "Unable to read file. File may be corrupted"                                                   | Parser           |
| 4   | **Empty file** — 0-byte upload                                           | Reject at upload stage with "File is empty"                                                                                    | Upload           |
| 5   | **Wrong extension** — `.pdf` renamed to `.docx`                          | Check magic bytes, not extension; reject if mismatch                                                                           | Upload           |
| 6   | **Multi-column PDF layout** — Two-column resume (common for CVs)         | PDF text extraction may interleave columns; no perfect solution; log warning "Layout may have reordered text"                  | Parser           |
| 7   | **DOCX with tracked changes** — Resume has accept/reject pending changes | Extract final (accepted) state only; reject tracked-changes-only documents                                                     | Parser           |
| 8   | **Non-ASCII characters** — Accented names (José, Müller), Cyrillic, CJK  | Must preserve Unicode throughout pipeline; verify in and out                                                                   | Parser + storage |
| 9   | **File name injection** — `../../../etc/passwd.pdf`                      | Sanitize file name before storage; generate UUID-based filenames server-side                                                   | Upload           |
| 10  | **10MB+ files** — Extremely large resume PDF                             | Reject with "File exceeds 10MB limit"                                                                                          | Upload           |

---

### P2.2 — LLM Client & Prompt System

| #   | Edge Case                                                                            | Expected Behavior                                                                                       | Check          |
| --- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | -------------- |
| 1   | **LLM returns malformed JSON** — Missing closing brace, extra comma                  | Zod validation fails → retry (up to 3 attempts). If all fail, return error "AI response parsing failed" | LLM client     |
| 2   | **LLM returns valid JSON but wrong schema** — Missing required field `score`         | Zod catches missing fields; retry with more explicit prompt instructions                                | LLM client     |
| 3   | **LLM timeout** — No response within 30s                                             | Trigger retry with exponential backoff; after 3 retries, circuit breaker opens for 60s                  | LLM client     |
| 4   | **LLM hallucinates confident but false response** — Returns fabricated score         | Guardrails catch this partially; no perfect defense; cache validation against known-different inputs    | LLM client     |
| 5   | **Empty prompt variable** — `{jd_excerpt}` is empty because JD is missing            | Prompt builder should fail validation before calling LLM: "Job description is required"                 | Prompt loader  |
| 6   | **Prompt exceeds token limit** — Resume + JD = 15K tokens, model max = 8K            | Truncate strategically: keep JD summary and resume experience section; drop least relevant sections     | Prompt builder |
| 7   | **Cache key collision** — Two different inputs produce same hash                     | Include `model` and `temperature` in cache key; hash full input text, not just parameters               | Cache          |
| 8   | **Cache stale during resume re-upload** — User updates resume, old analysis returned | Invalidate cache on `resume.updated` event; include resume version in cache key                         | Cache          |
| 9   | **Mock mode with real-looking data** — Developer mistakes mock for real              | Mock responses should be clearly labeled with `_mock: true` flag; UI should show "DEMO DATA" badge      | Mock provider  |
| 10  | **Zod schema drift** — LLM changes output format after model update                  | Snapshot tests should alert on schema drift; CI should fail if snapshots don't match                    | Snapshots      |

---

### P2.3 — Analysis Pipeline

| #   | Edge Case                                                                                   | Expected Behavior                                                                                                                     | Check            |
| --- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 1   | **Resume has no experience section** — Fresh graduate with only education                   | Analyzer should return score based on education + skills; gap analysis should note "No professional experience" as low-importance gap | Analyzer         |
| 2   | **Job description is a single sentence** — Minimal JD with no skill list                    | Analyzer should still score; gap analysis may return empty gaps with note "Insufficient JD detail to identify gaps"                   | Analyzer         |
| 3   | **Resume and JD are for completely different fields** — Resume: Chef, JD: Software Engineer | Score should be very low (0-15); gap analysis lists entire JD as gaps; UI should show "This role may not align with your background"  | Analyzer + UI    |
| 4   | **Resume is extremely long** — 20+ page CV                                                  | Truncate to most recent 10 years / 2 pages for analysis; log warning "Resume truncated to most recent experience"                     | Analyzer         |
| 5   | **Gap analysis returns 50+ gaps** — Complete mismatch                                       | Cap displayed gaps at 20 for each importance level; "X more gaps not shown"                                                           | Gap analyzer     |
| 6   | **Analyze same resume+JD pair twice** — Score differs by > 3 points                         | LLM temperature introduces variance; acceptable range is ±5 points; cache should prevent duplicate LLM calls                          | Analyzer + cache |

---

### P2.4 — Tailoring Pipeline

| #   | Edge Case                                                           | Expected Behavior                                                                                             | Check               |
| --- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1   | **Resume has zero bullet points** — Summary-only resume             | Tailor should optimize summary section; note "No bullet points found to tailor"                               | Tailor              |
| 2   | **Single bullet point resume** — Minimal content                    | Tailor generates 1-2 tailored versions; diff shows only that section                                          | Tailor              |
| 3   | **Job description drastically different from resume** — No overlap  | Tailor should preserve original phrasing and admit low match; guardrails should flag any fabrication attempts | Tailor + guardrails |
| 4   | **Bullet already perfectly aligned with JD** — No changes needed    | Diff shows "No changes needed" with green checkmark; confidence score > 0.95                                  | Tailor + diff       |
| 5   | **Extremely long bullet point** — 3+ lines of text                  | Tailor should handle full paragraph bullets; not truncate input                                               | Tailor              |
| 6   | **Tailoring creates factual error** — Changes dates or company name | Guardrails should catch this and restore original with warning                                                | Guardrails          |
| 7   | **Diff viewer with 500 changed lines** — Complete rewrite           | Paginate diff view (50 lines per page); scroll sync must still work per page                                  | Diff viewer         |
| 8   | **User cancels mid-tailor** — Navigates away while LLM is running   | Backend should not orphan the LLM call; results can be cached if they arrive; no partial state saved          | Tailor              |

---

### P2.5 — Guardrail System

| #   | Edge Case                                                                                                         | Expected Behavior                                                                                                | Check             |
| --- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------- |
| 1   | **False positive: legitimate company name flagged as fabricated** — Niche startup the guardrail doesn't recognize | Log as warning, not fail; user can override with "This is legitimate" flag                                       | Guardrails        |
| 2   | **False negative: subtle inflation missed** — "Led team of 5" → "Led team of 10"                                  | Difficult to catch; metrics guardrail should check: original metric exists, change is within 20%                 | Metrics guardrail |
| 3   | **Title standardization causing false alarm** — "Software Engineer II" → "Software Engineer 2"                    | Normalize titles before comparison; `II` == `2`                                                                  | Truthfulness      |
| 4   | **Experience level ambiguity** — 3 years experience described as "Senior"                                         | Seniority guardrail should apply industry standards: < 5 years = mid, 5+ = senior, 8+ = lead                     | Seniority         |
| 5   | **All guardrails pass but output is still bad** — Grammatically correct but semantically wrong                    | This is an LLM quality issue, not guardrail; collect user feedback for fine-tuning                               | Feedback          |
| 6   | **Guardrail timeout** — LLM call for guardrail takes > 10s                                                        | Log warning; if guardrail check itself times out, accept with caution flag "Guardrails did not complete in time" | Guardrails        |

---

### P2.6 — PDF Export

| #   | Edge Case                                                                   | Expected Behavior                                                                                          | Check         |
| --- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------- |
| 1   | **Resume spans 10+ pages** — Very long career history                       | PDF should paginate; each page should have consistent headers; no content overflow                         | PDF generator |
| 2   | **Unicode fonts missing in PDF** — Emoji or CJK characters render as boxes  | Embed Noto Sans or similar fallback font; log missing glyphs                                               | PDF generator |
| 3   | **Page break in middle of bullet point** — Single bullet split across pages | `page-break-inside: avoid` on bullet points; if unavoidable, repeat at top of next page with "(continued)" | PDF CSS       |
| 4   | **Concurrent PDF generation requests** — 10 exports simultaneously          | Playwright browser pool (max 3 instances); queue excess requests                                           | PDF generator |
| 5   | **PDF generation timeout** — Large resume takes > 30s                       | Return 202 Accepted with polling endpoint; generate asynchronously                                         | PDF API       |
| 6   | **Download interrupted mid-stream** — User cancels download                 | No server-side cleanup needed; temporary file should have TTL of 5 minutes                                 | Export        |

---

### P2.7 — Resume Tailor Tests

| #   | Edge Case                                                                                            | Expected Behavior                                                                   | Check         |
| --- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------- |
| 1   | **DOCX with embedded images** — No text extraction fallback                                          | Parser should extract only text; images ignored; no crash                           | Parser test   |
| 2   | **LLM returns empty string** — Response body is `""`                                                 | Client should treat as validation failure and retry                                 | LLM test      |
| 3   | **Circuit breaker prevents all LLM calls** — 5 failures in 60s                                       | Subsequent calls should immediately return 503 "AI service temporarily unavailable" | LLM test      |
| 4   | **Snapshot test with non-deterministic output** — LLM returns valid but different response each time | Snapshots should validate schema + field types, not exact values                    | Snapshot test |

---

## Phase P3 — The Closer (Cold Email Outreach)

### P3.1 — Email Generation

| #   | Edge Case                                                                         | Expected Behavior                                                                                                                                       | Check         |
| --- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| 1   | **Missing personalization data** — Company or role not available                  | Template should fall back gracefully: "I'm interested in opportunities at your company" instead of "I'm interested in the {{role}} role at {{company}}" | Generator     |
| 2   | **All template variables missing** — No personalization data at all               | Use generic template; flag as "low confidence — review carefully" in preview                                                                            | Generator     |
| 3   | **HTML injection via variable** — Company name is `<script>alert('xss')</script>` | Jinja2 auto-escapes by default; confirm `autoescape=true` in environment config                                                                         | Templates     |
| 4   | **Extremely long company name** — 100+ characters                                 | Truncate to 50 chars in subject line; full name in body                                                                                                 | Generator     |
| 5   | **Follow-up sent before initial email is sent** — Race condition in scheduling    | Check `status !== 'sent'` before allowing follow-up generation                                                                                          | Follow-up     |
| 6   | **LLM-generated email contains fabricated claims** — AI makes up experience       | No guardrails in MVP; phase 2 adds check: "Verify: all claims exist in resume?"                                                                         | LLM generator |

---

### P3.2 — SMTP Delivery

| #   | Edge Case                                                                                             | Expected Behavior                                                                               | Check        |
| --- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------ |
| 1   | **SMTP connection refused** — Wrong host or port                                                      | Retry 3 times with 30s backoff; after failure, log error and save as draft                      | Sender       |
| 2   | **SMTP authentication failed** — Invalid credentials                                                  | Fail immediately (no retry); log error with hint "Check SMTP_USER and SMTP_PASSWORD"            | Sender       |
| 3   | **TLS negotiation failed** — Server requires TLS but client can't agree                               | Try STARTTLS; fall back to SSL if available; log TLS version error                              | Sender       |
| 4   | **Gmail App Password required** — Regular password rejected with "username and password not accepted" | Check error message for "App password" and surface specific instructions                        | Sender       |
| 5   | **Recipient email invalid** — `notanemail`                                                            | Validate email format before queuing; reject with 422 at generate stage                         | Sender       |
| 6   | **Rate limited by SMTP provider** — Gmail limits: 500/day for personal, 2000/day for Workspace        | Track sent count per provider; enforce our own cap (100/day) lower than provider limit          | Rate limiter |
| 7   | **Dry-run mode accidentally disabled** — User sets `DRY_RUN=false` without SMTP config                | Validate SMTP config on startup when `DRY_RUN=false`; abort with clear error if missing         | Config       |
| 8   | **Email queued but never sent** — Queue consumer crashes                                              | Queue should be persistent (Redis RDB/AOF); consumer should pick up unprocessed jobs on restart | Queue        |

---

### P3.3 — Preview Engine

| #   | Edge Case                                                                  | Expected Behavior                                                                                 | Check      |
| --- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------- |
| 1   | **Email contains external images** — Remote images that may be blocked     | Strip remote images by default; local-only images; note in preview: "X external images removed"   | Preview    |
| 2   | **CSS in email not inlined** — Gmail strips `<style>` tags                 | CSS must be inlined into each HTML element before preview; use `premailer` or similar             | Preview    |
| 3   | **Email too long for preview** — 5000+ word body                           | Truncate preview to first 500 words with "Show full email" toggle                                 | Preview    |
| 4   | **Unsubscribe link generation** — Required by CAN-SPAM law                 | Every email must include `{{{ unsubscribe_url }}}`; if missing, preview should flag as warning    | Preview    |
| 5   | **Tracking pixel blocked** — Gmail images disabled by default              | Alt text on pixel: "1x1 transparent pixel for open tracking"; tracking still works if images load | Preview    |
| 6   | **Edit changes lost on navigation** — User edits email then navigates away | Warn before leaving: "You have unsaved changes. Discard?"                                         | Preview UI |

---

### P3.4 — Audit Logging

| #   | Edge Case                                                               | Expected Behavior                                                                   | Check  |
| --- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------ |
| 1   | **Log write fails** — DB unavailable during send                        | Buffer log in Redis; flush when DB is available; never block the send on log write  | Logger |
| 2   | **Subject contains PII** — Email includes full name in subject          | Log only hashed subject; full subject visible only on detail page (auth required)   | Logger |
| 3   | **Send succeeds, log write fails** — Email sent but not logged          | Reconciliation job: compare sent queue with logs every hour; flag discrepancies     | Logger |
| 4   | **Stats off by one** — Race condition on concurrent sends               | Use atomic increment in Redis for stats; batch-write to DB every 5 minutes          | Stats  |
| 5   | **CSV export of logs exceeds memory** — 50K+ log entries for power user | Stream CSV in chunks; use server-side cursor; never load entire dataset into memory | Export |

---

### P3.5 — Outreach Console UI

| #   | Edge Case                                                                     | Expected Behavior                                                                                 | Check        |
| --- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------ |
| 1   | **Send queue with 500 pending items** — User queued many at once              | Virtualize list (only render visible rows); infinite scroll; batch actions for selecting multiple | Send queue   |
| 2   | **Delivery log status is stale** — "sent" shown but actually bounced          | WebSocket push updates status in real-time; manual refresh button; last-updated timestamp         | Delivery log |
| 3   | **Volume cap resets mid-session** — User hits limit, waits, then limit resets | Gauge should update dynamically; show "Resets in 12:34" countdown; auto-retry queued items        | Volume gauge |
| 4   | **Empty state — no emails sent yet**                                          | Show "No outreach yet. Start by tailoring a resume and generating an email." with CTA button      | Empty state  |

---

### P3.6 — Outreach Tests

| #   | Edge Case                                                                                | Expected Behavior                                                                  | Check             |
| --- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------- |
| 1   | **Mock SMTP server receives partial data** — Connection drops mid-DATA                   | Sender should treat as failure, retry; log partial send                            | SMTP test         |
| 2   | **Rate limiter with burst of 20 requests** — All arrive in same second                   | Token bucket allows burst of 5; remaining 15 get 429; check `Retry-After` accuracy | Rate limiter test |
| 3   | **HTML-to-text conversion loses links** — `<a href="...">click</a>` becomes just "click" | Text version must include `[click: URL]` or similar; verify in test                | Generator test    |

---

## Phase P4 — Integration

### P4.1 — Pipeline Orchestrator

| #   | Edge Case                                                                          | Expected Behavior                                                                                       | Check        |
| --- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------ |
| 1   | **Pipeline started with no resume uploaded** — User skips to outreach              | Orchestrator should validate prerequisites at each step; return "Resume required before tailoring"      | Orchestrator |
| 2   | **Pipeline interrupted mid-step** — Server crash during tailoring                  | On restart, recover from last completed step via persisted state in Redis; don't restart from beginning | Recovery     |
| 3   | **Pipeline never progresses past one step** — Stuck in "analyzing" for 30+ minutes | Timeout pipeline step after 10 minutes; mark as `failed` with error "Step timed out"; notify user       | Orchestrator |
| 4   | **User starts two pipelines for same job** — Duplicate application                 | Detect duplicate `userId + jobId` in applications table; return existing application ID                 | Orchestrator |
| 5   | **Pipeline with 50 jobs in batch** — User selects all for processing               | Process sequentially (one at a time); show progress "3/50 tailored"; support cancellation               | Orchestrator |
| 6   | **Abandoned pipeline resurrected** — User returns after 48h                        | Pipeline expired after 24h; show "Your session expired. Start a new pipeline?"                          | Orchestrator |

---

### P4.2 — Event Bus

| #   | Edge Case                                                                      | Expected Behavior                                                                                        | Check        |
| --- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ------------ |
| 1   | **Duplicate event published** — Exactly same event delivered twice             | Idempotent consumers: check event ID in processed set before acting; deduplicate within 5min window      | Event bus    |
| 2   | **Event published before consumer subscribes** — Race condition                | Use Redis streams (not Pub/Sub) for persistent events; consumer reads from last acknowledged ID          | Event bus    |
| 3   | **Consumer crashes mid-processing** — Event acknowledged but not fully handled | Consumer should acknowledge after processing completes; unacknowledged events are redelivered            | Event bus    |
| 4   | **WebSocket disconnects during event flood** — 100 events/second               | Client should debounce/batch UI updates; max 10 UI updates per second; WebSocket reconnects with backoff | WebSocket    |
| 5   | **Event ordering violated** — "email.sent" arrives before "resume.tailored"    | Orchestrator should validate current state: reject events that don't follow valid state transitions      | Orchestrator |

---

### P4.3 — Unified UI

| #   | Edge Case                                                                               | Expected Behavior                                                                             | Check     |
| --- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------- |
| 1   | **Dashboard loads with 0 jobs** — New user, no search performed                         | Show empty state: "Search for jobs to get started" with search bar prominent                  | Dashboard |
| 2   | **Kanban card dragged to invalid column** — "Discovered" → "Offer" (skipping all steps) | Revert to original column with toast: "Applications must progress through each stage"         | Kanban    |
| 3   | **Kanban board with 200+ cards** — Heavy user with many applications                    | Column virtualization; batch render 20 cards per column; lazy load as user scrolls            | Kanban    |
| 4   | **Sidebar collapsed on narrow screen** — Mobile view                                    | Sidebar auto-collapses below 768px; hamburger menu to expand; overlay mode                    | Layout    |
| 5   | **Browser tab title not updated** — User can't find the right tab                       | Set `document.title` on each page: "Dashboard — Job Platform", "Resume Studio — Job Platform" | Pages     |
| 6   | **Deep linking to specific application** — `/dashboard/tracker?id=abc123`               | Should load the application and scroll to it; if not found, show 404 with back link           | Router    |

---

### P4.4 — Application Tracking

| #   | Edge Case                                                         | Expected Behavior                                                                                                                       | Check             |
| --- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 1   | **Invalid status transition** — "discovered" → "interview"        | Return 422 with message "Cannot skip stages. Valid transitions: discovered → analyzed → tailored → outreach_sent → applied → interview" | Status validation |
| 2   | **Backwards transition** — "interview" → "analyzed"               | Allow only if previous status was a mistake; log a timeline event "Status reverted from interview to analyzed (user override)"          | Status validation |
| 3   | **Follow-up scheduled but application closed** — User got the job | Cancel all pending follow-ups when status changes to "offer" or "rejected"                                                              | Follow-up         |
| 4   | **Stats aggregation over empty dataset** — No applications yet    | Return zero values, not errors: `{ total: 0, byStatus: {}, responseRate: 0, avgScore: 0 }`                                              | Stats             |
| 5   | **Stats with 1 application** — Single data point edge case        | `avgScore` = that one score; `responseRate` = 0 or 100; no division by zero                                                             | Stats             |

---

### P4.5 — Integration Tests

| #   | Edge Case                                                                                   | Expected Behavior                                                                             | Check    |
| --- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------- |
| 1   | **Pipeline test with slow LLM** — Mock LLM returns after 15s                                | Test timeout should be 30s; mock should support configurable delay                            | E2E test |
| 2   | **Concurrent pipeline test crossing user boundaries** — User A's action affects User B      | Verify every API call includes auth; assert User B's data unchanged                           | E2E test |
| 3   | **Error recovery test where orchestrator restarts mid-DB write** — Half-written application | DB transaction ensures atomicity; on restart, the write either committed fully or rolled back | E2E test |

---

## Phase P5 — Polish

### P5.1 — Performance

| #   | Edge Case                                                                         | Expected Behavior                                                                                    | Check         |
| --- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------- |
| 1   | **Cache stampede** — 50 concurrent requests for same uncached LLM response        | First request acquires lock; remaining wait for result; use Redis `SET NX` with TTL                  | Cache         |
| 2   | **Memory leak from PDF generation** — Playwright browser process not killed       | Always use `browser.close()` in `finally` block; pool size limit (3 max); health check kills zombies | PDF generator |
| 3   | **N+1 query on kanban board** — Loading each application's job separately         | Use `JOIN` or DataLoader; verify SQL log shows 1 query per board load, not N+1                       | DB queries    |
| 4   | **Large bundle from Shadcn unused components** — Tree-shaking not removing unused | Configure `tailwind.config.js` to purge unused classes; audit with `next/bundle-analyzer`            | Bundle        |

---

### P5.2 — Security Hardening

| #   | Edge Case                                                               | Expected Behavior                                                                                                    | Check        |
| --- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------ |
| 1   | **SVG upload with embedded script** — `<svg onload="alert(1)">`         | File magic bytes detect SVG → reject: "SVG files are not supported"                                                  | Upload       |
| 2   | **ZIP bomb** — Tiny `.docx` that expands to gigabytes                   | Enforce file size at network layer (before buffering); reject > 10MB at ingress                                      | Upload       |
| 3   | **CSP bypass via JSONP** — Existing page endpoint used as script source | CSP should not include `unsafe-inline` or `unsafe-eval`; strict nonce-based for scripts                              | CSP          |
| 4   | **Rate limit bypass via IP rotation** — Attacker uses 100 different IPs | Per-user rate limits (based on JWT) are primary; per-IP is secondary; API key required for unauthenticated endpoints | Rate limiter |
| 5   | **PII in LLM request logs** — Phone number sent to Groq API             | PII masking runs before any LLM call; verify in integration test that masked text contains `[REDACTED]`              | PII mask     |

---

### P5.3 — UX Refinement

| #   | Edge Case                                                                                           | Expected Behavior                                                                                                | Check         |
| --- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------- |
| 1   | **Touch target too small on mobile** — 32px button                                                  | All interactive elements minimum 44x44px for touch; test on iPhone SE (320px width)                              | Responsive    |
| 2   | **Offline form submission** — User fills form, loses connectivity, clicks submit                    | Detect offline state; save form data to `sessionStorage`; show "Reconnected — resubmit?" on return               | Offline       |
| 3   | **Keyboard shortcut conflict with browser** — `Ctrl+W` closes tab instead of doing what we intended | Only use custom shortcuts with modifier keys that don't conflict (`?` opens help modal showing all shortcuts)    | Keyboard      |
| 4   | **Screen reader doesn't announce status changes** — "Tailored successfully" not read                | Use `aria-live="polite"` region for status messages; `role="status"` for non-critical, `role="alert"` for errors | Accessibility |
| 5   | **Onboarding skipped mid-tour** — User clicks away from guide                                       | Guide should be dismissible; accessible from help menu; progress saved in localStorage                           | Onboarding    |

---

### P5.4 — Monitoring & Observability

| #   | Edge Case                                                                             | Expected Behavior                                                                                            | Check    |
| --- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------- |
| 1   | **Metrics endpoint overloaded by scraper** — Prometheus scrapes every 1s              | Metrics are precomputed and cached for 5s; no request-time aggregation                                       | Metrics  |
| 2   | **Trace ID not propagated to background job** — Queue consumer has no parent span     | Extract trace context from job metadata; create child span for queue processing                              | Tracing  |
| 3   | **JSON log truncated at 10MB** — Single log entry too large (e.g., full LLM response) | Truncate log fields at 10KB; LLM response logged at `DEBUG` level only; full response in separate file       | Logging  |
| 4   | **Alert fatigue** — PagerDuty fires every 5 minutes for minor issues                  | Alert thresholds: critical (PagerDuty) only for user-facing errors > 5%; warnings to Slack for investigation | Alerting |

---

## Quick Reference: Common Patterns Across Phases

| Pattern                 | Where It Appears                                                       | Mitigation                                                                           |
| ----------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Empty results**       | P1 (no jobs), P2 (empty resume), P3 (no logs), P4 (no apps)            | Return empty array/object, never an error; show helpful empty state in UI            |
| **Race conditions**     | P0 (upsert), P2 (cache), P3 (send+log), P4 (events)                    | DB transactions, Redis locks, idempotency keys, atomic operations                    |
| **Timeouts**            | P1 (scraping), P2 (LLM), P3 (SMTP), P4 (pipeline)                      | Retry with backoff, circuit breaker, clear error to user                             |
| **Partial failures**    | P1 (source down), P2 (some bullets fail), P3 (batch send partial fail) | Succeed on partial results; report failures clearly; never silently drop             |
| **Resource exhaustion** | P1 (memory from large datasets), P2 (token limits), P3 (rate limits)   | Hard caps, streaming, pagination, graceful degradation                               |
| **Invalid user input**  | All phases                                                             | Validate at API boundary with Zod/Pydantic; sanitize for storage; escape for display |
