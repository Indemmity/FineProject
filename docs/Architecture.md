# Job Application Platform — Architecture Document

> **Audience**: Engineers contributing to or extending the platform.  
> **Scope**: System design, service boundaries, data flow, API contracts, AI pipeline, and deployment.

---

## 1. System Architecture Overview

The platform follows a **modular, service-oriented architecture** with three domain services coordinated by a central orchestrator. Each service can run independently or as part of the integrated platform.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                │
│  ┌─────────────────────┐  ┌────────────────┐  ┌──────────────────┐ │
│  │  Job Dashboard       │  │  Resume Studio  │  │  Outreach Console│ │
│  │  (search, browse,    │  │  (upload, view, │  │  (preview, send, │ │
│  │   filter jobs)       │  │  tailor, score) │  │  track emails)   │ │
│  └─────────┬───────────┘  └───────┬────────┘  └────────┬─────────┘ │
│            │                      │                     │           │
│            └──────────────────────┼─────────────────────┘           │
│                                   │                                 │
│                         ┌─────────▼─────────┐                      │
│                         │   Next.js App      │                      │
│                         │  (React 19, App    │                      │
│                         │   Router, SSR)     │                      │
│                         └─────────┬─────────┘                      │
└───────────────────────────────────┼─────────────────────────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────┐
│                       API GATEWAY                                   │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Next.js API Routes (BFF Pattern)                             │ │
│  │  /api/jobs/*    /api/resume/*    /api/outreach/*              │ │
│  │  /api/storage/* /api/auth/*       /api/tracking/*             │ │
│  │                                                                │ │
│  │  Middleware: Auth, Rate-Limit, Request Logging, CORS           │ │
│  └────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────┐
│                      SERVICE LAYER                                   │
│                                                                      │
│  ┌─────────────────────┐  ┌────────────────────┐  ┌───────────────┐ │
│  │  Job Harvester       │  │  Resume Tailor     │  │  The Closer   │ │
│  │  (Python/FastAPI)    │  │  (Next.js BFF)     │  │  (Python/CLI) │ │
│  │                      │  │                    │  │               │ │
│  │  ┌─────────────────┐│  │  ┌──────────────┐   │  │  ┌─────────┐  │ │
│  │  │ Source Adapters ││  │  │ LLM Pipeline │   │  │  │ Email   │  │ │
│  │  │ - Naukri        ││  │  │ - Analyzer   │   │  │  │ Gen.    │  │ │
│  │  │ - RemoteOK      ││  │  │ - Tailor     │   │  │  ├─────────┤  │ │
│  │  │ - Wellfound     ││  │  │ - Guardrails │   │  │  │ SMTP    │  │ │
│  │  │ - Extensible     ││  │  │ - Validator  │   │  │  │ Sender  │  │ │
│  │  └─────────────────┘│  │  └──────────────┘   │  │  ├─────────┤  │ │
│  │  ┌─────────────────┐│  │  ┌──────────────┐   │  │  │ Preview │  │ │
│  │  │ Pipeline Engine  ││  │  │ PDF Engine   │   │  │  │ Engine  │  │ │
│  │  │ - Filter         ││  │  ├──────────────┤   │  │  ├─────────┤  │ │
│  │  │ - Dedup          ││  │  │ File Parser  │   │  │  │ Logger  │  │ │
│  │  │ - Normalize      ││  │  └──────────────┘   │  │  └─────────┘  │ │
│  │  └─────────────────┘│  │                    │  │               │ │
│  └─────────────────────┘  └────────────────────┘  └───────────────┘ │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────┐
│                       DATA LAYER                                     │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────┐ │
│  │  PostgreSQL   │  │  Redis        │  │  File Store  │  │  Queue  │ │
│  │  (Primary DB) │  │  (Cache/      │  │  (Resume     │  │  (Job   │ │
│  │               │  │   Session)    │  │   PDFs,      │  │  Tasks) │ │
│  │  - Jobs       │  │               │  │   Reports)   │  │         │ │
│  │  - Resumes    │  │  - Job cache  │  │              │  │  - Bull │ │
│  │  - Apps       │  │  - LLM cache │  │  - S3/Local  │  │  - Celery│ │
│  │  - Outreach   │  │  - Rate       │  │              │  │         │ │
│  │  - Users      │  │    limiter   │  │              │  │         │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Layer Responsibilities

### 2.1 Client Layer (Frontend)

| Page/View                   | Purpose                              | Components                                                   |
| --------------------------- | ------------------------------------ | ------------------------------------------------------------ |
| **Job Discovery Dashboard** | Search, browse, filter, select jobs  | SearchBar, FilterPanel, JobCard, Pagination, SavedJobsPanel  |
| **Resume Studio**           | Upload resume, view analysis, tailor | FileUploader, ResumePreview, ScoreGauge, GapList, DiffViewer |
| **Outreach Console**        | Review, approve, send emails         | EmailPreview, SendQueue, DeliveryLog, StatsCards             |
| **Application Tracker**     | Full pipeline view, kanban board     | KanbanBoard, FollowUpCalendar, StatusBadge, MetricCards      |

### 2.2 API Gateway (BFF Layer)

The Next.js API routes act as a Backend-for-Frontend (BFF) pattern, handling:

- **Auth**: Session validation, OAuth token refresh
- **Routing**: Proxy requests to appropriate backend services
- **Aggregation**: Combine data from multiple services for a single UI view
- **Transformation**: Convert backend data models to frontend view models
- **Error Handling**: Standardized error responses, retry logic

### 2.3 Service Layer

Each service encapsulates a distinct domain. Services communicate asynchronously via a message queue and synchronously via REST/gRPC for real-time operations.

| Service       | Language     | Framework   | Port       | Dependencies                       |
| ------------- | ------------ | ----------- | ---------- | ---------------------------------- |
| Job Harvester | Python 3.11+ | FastAPI     | 8001       | Selenium, BeautifulSoup, Firecrawl |
| Resume Tailor | TypeScript   | Next.js API | 3000 (BFF) | Groq SDK, Playwright, Zod          |
| The Closer    | Python 3.11+ | FastAPI     | 8002       | smtplib, Jinja2                    |
| Orchestrator  | TypeScript   | Node.js     | 8003       | Bull, Redis                        |

### 2.4 Data Layer

| Store          | Technology               | Purpose                          | Data                                                                    |
| -------------- | ------------------------ | -------------------------------- | ----------------------------------------------------------------------- |
| **Primary DB** | PostgreSQL 16            | Permanent storage, relationships | Jobs, Users, Applications, Resumes, OutreachLogs                        |
| **Cache**      | Redis 7                  | Ephemeral, high-speed access     | Session data, job query cache, LLM response cache, rate limiter buckets |
| **File Store** | S3-compatible / Local FS | Blob storage                     | Uploaded resumes, generated PDFs, exported CSVs                         |
| **Queue**      | Bull (Redis-backed)      | Async task scheduling            | Job scraping tasks, email delivery tasks, PDF generation tasks          |

---

## 3. Data Models

### 3.1 Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────────┐       ┌─────────────────┐
│    User       │       │      Job          │       │   Application    │
│──────────────│       │──────────────────│       │─────────────────│
│ id (PK)      │──┐    │ id (PK)          │──┐    │ id (PK)         │
│ email        │  │    │ source           │  │    │ user_id (FK)    │
│ name         │  │    │ source_id        │  │    │ job_id (FK)     │
│ preferences  │  │    │ title            │  │    │ resume_id (FK)  │
│ created_at   │  │    │ company          │  │    │ status          │
└──────────────┘  │    │ location         │  │    │ match_score     │
                  │    │ description      │  │    │ applied_at      │
                  │    │ salary_range     │  │    │ notes           │
                  │    │ job_type         │  │    └────────┬────────┘
                  │    │ posted_date      │  │             │
                  │    │ url              │  │             │
                  │    │ search_keyword   │  │             │
                  │    │ scraped_at       │  │             │
                  │    └──────────────────┘  │             │
                  │                          │             │
                  │    ┌──────────────────┐  │             │
                  │    │  Resume          │  │             │
                  │    │──────────────────│  │             │
                  └────│ id (PK)          │  │             │
                       │ user_id (FK)     │  │             │
                       │ original_file    │──┘             │
                       │ parsed_text      │                │
                       │ tailored_text    │                │
                       │ match_score      │                │
                       │ gap_analysis     │                │
                       │ created_at       │                │
                       └──────────────────┘                │
                                                           │
                    ┌──────────────────┐                    │
                    │  OutreachLog     │                    │
                    │──────────────────│                    │
                    │ id (PK)          │                    │
                    │ application_id   │◄───────────────────┘
                    │ status           │
                    │ recipient_email  │
                    │ subject          │
                    │ body_preview     │
                    │ sent_at          │
                    │ delivery_status  │
                    │ error_message    │
                    └──────────────────┘
```

### 3.2 Core JSON Schemas

**Job**

```typescript
interface Job {
  id: string;
  source: 'naukri' | 'remoteok' | 'wellfound';
  sourceId: string; // native ID from source
  title: string;
  company: string;
  location: string | null;
  description: string; // full job description text
  descriptionHtml: string; // original HTML for reference
  salaryRange: string | null;
  jobType: 'full-time' | 'part-time' | 'contract' | 'internship';
  remote: boolean;
  experienceLevel: 'entry' | 'mid' | 'senior' | 'lead';
  postedDate: Date;
  url: string;
  searchKeyword: string; // what the user searched for
  scrapedAt: Date;
  raw: Record<string, unknown>; // original source data
}
```

**Application**

```typescript
interface Application {
  id: string;
  userId: string;
  jobId: string;
  resumeId: string;
  status:
    | 'discovered'
    | 'analyzed'
    | 'tailored'
    | 'outreach_sent'
    | 'applied'
    | 'interview'
    | 'offer'
    | 'rejected'
    | 'closed';
  matchScore: number; // 0-100
  gapAnalysis: GapItem[];
  tailoredResumeText: string;
  coverLetterText: string | null;
  appliedAt: Date | null;
  notes: string;
  timeline: TimelineEvent[];
}

interface GapItem {
  skill: string;
  importance: 'high' | 'medium' | 'low';
  category: 'technical' | 'domain' | 'soft_skill' | 'education';
  suggestedAction: string;
}

interface TimelineEvent {
  timestamp: Date;
  event: string;
  detail: string;
  source: 'system' | 'user';
}
```

**OutreachLog**

```typescript
interface OutreachLog {
  id: string;
  applicationId: string;
  status: 'draft' | 'previewed' | 'sent' | 'failed' | 'bounced' | 'replied';
  recipientEmail: string;
  recipientName: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  sentAt: Date | null;
  deliveryStatus: string;
  openedAt: Date | null; // via tracking pixel
  repliedAt: Date | null;
  errorMessage: string | null;
  attachments: string[]; // paths/URLs
}
```

---

## 4. API Contracts

### 4.1 REST Endpoints

#### Job Harvester Service (`/api/jobs`)

| Method   | Path                    | Description                    | Request                                                            | Response                    |
| -------- | ----------------------- | ------------------------------ | ------------------------------------------------------------------ | --------------------------- |
| `POST`   | `/api/jobs/search`      | Search and aggregate jobs      | `{ keywords, location?, remoteOnly?, experienceLevel?, sources? }` | `{ jobId, results: Job[] }` |
| `GET`    | `/api/jobs/:id`         | Get job details                | —                                                                  | `Job`                       |
| `POST`   | `/api/jobs/:id/refresh` | Re-scrape a specific job       | —                                                                  | `Job`                       |
| `DELETE` | `/api/jobs/:id`         | Remove a job listing           | —                                                                  | `{ success }`               |
| `GET`    | `/api/jobs/sources`     | List available job sources     | —                                                                  | `{ sources: SourceInfo[] }` |
| `POST`   | `/api/jobs/batch`       | Batch search multiple keywords | `{ queries: SearchQuery[] }`                                       | `{ results: Job[][] }`      |

#### Resume Tailor Service (`/api/resume`)

| Method | Path                      | Description                   | Request                                       | Response                                  |
| ------ | ------------------------- | ----------------------------- | --------------------------------------------- | ----------------------------------------- |
| `POST` | `/api/resume/upload`      | Upload base resume            | `multipart: file`                             | `{ resumeId, parsedText }`                |
| `POST` | `/api/resume/:id/analyze` | Score resume against a job    | `{ jobId }`                                   | `{ matchScore: number, gaps: GapItem[] }` |
| `POST` | `/api/resume/:id/tailor`  | Generate tailored resume      | `{ jobId }`                                   | `{ original, tailored, diff, score }`     |
| `GET`  | `/api/resume/:id`         | Get resume details            | —                                             | `Resume`                                  |
| `POST` | `/api/resume/:id/export`  | Export tailored resume as PDF | `{ jobId, type: 'tailored' \| 'comparison' }` | `{ pdfUrl }`                              |
| `POST` | `/api/resume/parse-text`  | Parse raw resume text         | `{ text, format: 'pdf'\|'docx'\|'txt' }`      | `{ parsed: ParsedResume }`                |

#### Outreach Service (`/api/outreach`)

| Method | Path                        | Description               | Request                         | Response                             |
| ------ | --------------------------- | ------------------------- | ------------------------------- | ------------------------------------ |
| `POST` | `/api/outreach/generate`    | Generate outreach email   | `{ applicationId }`             | `{ draft: EmailDraft }`              |
| `POST` | `/api/outreach/:id/preview` | Preview as rendered email | —                               | `{ html, text, subject }`            |
| `POST` | `/api/outreach/:id/send`    | Send the email            | `{ mode: 'draft' \| 'send' }`   | `{ status, sentAt?, messageId? }`    |
| `GET`  | `/api/outreach/logs`        | Get delivery logs         | `{ page, status?, from?, to? }` | `{ logs: OutreachLog[], total }`     |
| `GET`  | `/api/outreach/stats`       | Outreach statistics       | —                               | `{ sent, opened, replied, bounced }` |

#### Application Tracking (`/api/applications`)

| Method  | Path                      | Description               | Request                    | Response                                      |
| ------- | ------------------------- | ------------------------- | -------------------------- | --------------------------------------------- |
| `POST`  | `/api/applications`       | Create application record | `{ jobId, resumeId }`      | `Application`                                 |
| `PATCH` | `/api/applications/:id`   | Update status             | `{ status, notes? }`       | `Application`                                 |
| `GET`   | `/api/applications`       | List user's applications  | `{ status?, sort?, page }` | `{ applications: Application[], total }`      |
| `GET`   | `/api/applications/:id`   | Full application detail   | —                          | `Application` (includes timeline)             |
| `GET`   | `/api/applications/stats` | Aggregated stats          | —                          | `{ total, byStatus, responseRate, avgScore }` |

---

## 5. AI / LLM Pipeline

### 5.1 Architecture

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Prompt       │───▶│  LLM Client  │───▶│  Response    │───▶│  Guardrail   │
│  Builder      │    │  (Groq SDK)  │    │  Parser      │    │  Validator   │
│               │    │              │    │  (Zod)       │    │              │
│  - Templates  │    │  - Retry     │    │              │    │  - Truth     │
│  - Variables  │    │  - Fallback  │    │  - ZodSchema │    │  - Fabrication│
│  - Context    │    │  - Timeout   │    │  - TypeGuard │    │  - Consistency│
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                                  │
                                                  ▼
                                         ┌──────────────┐
                                         │  Cache Layer  │
                                         │  (Redis,      │
                                         │   TTL=24h)    │
                                         └──────────────┘
```

### 5.2 Prompt Modules

| Module                | Model         | Input                        | Output (Zod-validated)               | Notes                    |
| --------------------- | ------------- | ---------------------------- | ------------------------------------ | ------------------------ |
| **Resume Analyzer**   | Llama 3.3 70B | Resume text + JD             | Score (0-100), skill match breakdown | Used for initial scoring |
| **Resume Tailor**     | Llama 3.3 70B | Resume + JD + Score          | Tailored bullets with change reasons | Per-section rewriting    |
| **Gap Analyzer**      | Llama 3.3 70B | JD + Resume                  | GapItem[] with importance ratings    | Detects missing skills   |
| **Guardrail Checker** | Llama 3.3 70B | Original + Tailored          | `{ passed, issues[], severity }`     | Verifies truthfulness    |
| **Email Generator**   | Llama 3.3 70B | Company + Role + JD + Resume | Subject + body text + call-to-action | Personalized outreach    |

### 5.3 Prompt Architecture (Template System)

```
prompts/
├── resume/
│   ├── analyze.txt           # Job-to-resume match scoring
│   ├── tailor.txt            # Bullet rewriting with JD alignment
│   ├── tailor-explain.txt    # Reason for each change
│   └── gaps.txt              # Gap analysis
├── guardrails/
│   ├── truthfulness.txt      # Fabrication detection
│   ├── seniority.txt         # Seniority inflation check
│   └── metrics.txt           # Metric inflation check
├── outreach/
│   ├── cold-email.txt        # Personalized cold email generation
│   └── follow-up.txt         # Follow-up email generation
└── system/
    ├── default.txt            # System prompt base
    └── formats.md             # Output format instructions
```

**Prompt Template Structure** (example: `tailor.txt`):

```
You are a professional resume writer. Given a JOB DESCRIPTION and an existing
RESUME BULLET, rewrite the bullet to better align with the job description.

Rules:
- Do NOT fabricate experience or skills the candidate doesn't have
- Keep the same time period and job title
- Emphasize relevant skills from the job description
- Use active voice and measurable impacts where possible
- Return the rewritten bullet AND a brief explanation of what changed

Job Description Context:
{jd_excerpt}

Original Bullet:
{original_bullet}

Relevant Skills from JD:
{target_skills}

Output as JSON:
{
  "rewritten": "rewritten bullet text",
  "change_reason": "why this change was made",
  "confidence": 0.85
}
```

### 5.4 LLM Client Configuration

```typescript
interface LLMConfig {
  model: string; // e.g. "llama-3.3-70b-versatile"
  temperature: number; // 0.1-0.7 depending on task
  maxTokens: number; // 1024-4096
  retry: {
    maxAttempts: number; // 3
    backoffMs: number; // 1000
    maxBackoffMs: number; // 10000
  };
  cacheTtlMs: number; // 86400000 (24h) for analysis
  timeoutMs: number; // 30000
}
```

### 5.5 Caching Strategy

| Cache Key Pattern                   | TTL | Invalidated When                 |
| ----------------------------------- | --- | -------------------------------- |
| `analyze:{resumeHash}:{jdHash}`     | 24h | Resume re-uploaded or JD changes |
| `tailor:{resumeHash}:{jdHash}`      | 24h | Resume re-uploaded               |
| `guardrail:{tailoredHash}`          | 48h | Never (immutable check)          |
| `email:{company}:{role}:{userName}` | 7d  | User changes preferences         |

---

## 6. Data Flow: End-to-End Application Pipeline

### 6.1 Full Pipeline Sequence

```
  User           Frontend           API Gateway          Job Harvester       Resume Tailor      The Closer           DB
  ────           ────────           ───────────          ─────────────       ─────────────      ──────────          ──
   │                │                    │                    │                   │                   │               │
   │  Search jobs   │                    │                    │                   │                   │               │
   │───────────────▶│                    │                    │                   │                   │               │
   │                │  POST /api/jobs    │                    │                   │                   │               │
   │                │───────────────────▶│                    │                   │                   │               │
   │                │                    │  Queue scrape      │                   │                   │               │
   │                │                    │───────────────────▶│                   │                   │               │
   │                │                    │                    │  Fetch sources    │                   │               │
   │                │                    │                    │──────────────────▶│                   │               │
   │                │                    │                    │  Normalize +      │                   │               │
   │                │                    │                    │  Filter + Dedup   │                   │               │
   │                │                    │                    │◀──────────────────│                   │               │
   │                │                    │                    │  Store jobs       │                   │               │
   │                │                    │                    │───────────────────────────────────▶   │               │
   │                │  Return jobs       │                    │                   │                   │               │
   │                │◀───────────────────│                    │                   │                   │               │
   │  Select job    │                    │                    │                   │                   │               │
   │────────────────▶                    │                    │                   │                   │               │
   │                │                    │                    │                   │                   │               │
   │  Upload resume │                    │                    │                   │                   │               │
   │────────────────▶                    │                    │                   │                   │               │
   │                │  POST /api/resume  │                    │                   │                   │               │
   │                │───────────────────▶│                    │                   │                   │               │
   │                │                    │  Parse + store     │                   │                   │               │
   │                │                    │──────────────────────────────────────▶│                   │               │
   │                │                    │                    │                   │  Extract text    │               │
   │                │                    │                    │                   │──────────────────▶               │
   │                │                    │  Return resumeId   │                   │                   │               │
   │                │◀───────────────────│                    │                   │                   │               │
   │                │                    │                    │                   │                   │               │
   │  Analyze match │                    │                    │                   │                   │               │
   │────────────────▶                    │                    │                   │                   │               │
   │                │  POST /api/resume  │                    │                   │                   │               │
   │                │  /:id/analyze      │                    │                   │                   │               │
   │                │───────────────────▶│                    │                   │                   │               │
   │                │                    │  LLM: Analyze      │                   │                   │               │
   │                │                    │──────────────────────────────────────▶│                   │               │
   │                │                    │                    │                   │  + Score + Gaps   │               │
   │                │                    │                    │                   │──────────────────▶               │
   │                │  Return score+gaps │                    │                   │                   │               │
   │                │◀───────────────────│                    │                   │                   │               │
   │                │                    │                    │                   │                   │               │
   │  Tailor resume │                    │                    │                   │                   │               │
   │────────────────▶                    │                    │                   │                   │               │
   │                │  POST /api/resume  │                    │                   │                   │               │
   │                │  /:id/tailor       │                    │                   │                   │               │
   │                │───────────────────▶│                    │                   │                   │               │
   │                │                    │  LLM: Tailor       │                   │                   │               │
   │                │                    │──────────────────────────────────────▶│                   │               │
   │                │                    │                    │                   │  + Rewrite        │               │
   │                │                    │                    │                   │  + Guardrail check│               │
   │                │                    │                    │                   │──────────────────▶               │
   │                │                    │  LLM: Guardrails   │                   │                   │               │
   │                │                    │──────────────────────────────────────▶│                   │               │
   │                │  Return diff+score │                    │                   │                   │               │
   │                │◀───────────────────│                    │                   │                   │               │
   │  Approve       │                    │                    │                   │                   │               │
   │────────────────▶                    │                    │                   │                   │               │
   │                │                    │                    │                   │                   │               │
   │  Generate      │  POST /api/outreach│                    │                   │                   │               │
   │  outreach      │  /generate         │                    │                   │                   │               │
   │────────────────▶                    │                    │                   │                   │               │
   │                │──────────────────────────────────────────────────────────────────────────────▶│               │
   │                │                    │                    │                   │                   │               │
   │                │                    │                    │                   │                   │  Gen email    │
   │                │                    │                    │                   │                   │────────────────▶
   │                │  Return draft      │                    │                   │                   │               │
   │                │◀───────────────────│                    │                   │                   │               │
   │                │                    │                    │                   │                   │               │
   │  Preview       │                    │                    │                   │                   │               │
   │────────────────▶                    │                    │                   │                   │               │
   │                │                    │                    │                   │                   │               │
   │  Send/Approve  │  POST /api/outreach│                    │                   │                   │               │
   │────────────────▶  /:id/send         │                    │                   │                   │               │
   │                │──────────────────────────────────────────────────────────────────────────────▶│               │
   │                │                    │                    │                   │                   │  Deliver SMTP  │
   │                │                    │                    │                   │                   │────────────────▶
   │                │                    │                    │                   │                   │  Log result    │
   │                │                    │                    │                   │                   │────────────────▶
   │                │  Return status     │                    │                   │                   │               │
   │                │◀───────────────────│                    │                   │                   │               │
```

### 6.2 Pipeline Orchestrator

The orchestrator manages multi-step workflows with state persistence for resumability.

```typescript
// Orchestrator State Machine
type PipelineState =
  | 'searching_jobs'
  | 'jobs_found'
  | 'resume_uploaded'
  | 'analyzing_match'
  | 'tailoring_resume'
  | 'guardrail_checking'
  | 'ready_for_review'
  | 'generating_outreach'
  | 'outreach_preview'
  | 'outreach_sent'
  | 'completed';

interface PipelineContext {
  userId: string;
  jobId: string | null;
  resumeId: string | null;
  applicationId: string | null;
  outreachId: string | null;
  state: PipelineState;
  errors: string[];
  metadata: Record<string, unknown>;
}
```

---

## 7. Service Integration Patterns

### 7.1 Synchronous Communication (REST)

Used for real-time user interactions:

- **Request/Response**: All client-to-BFF and BFF-to-service calls
- **Polling**: For long-running operations (job search, PDF generation)
- **Timeouts**: 30s default, 60s for PDF generation

### 7.2 Asynchronous Communication (Message Queue)

Used for background processing:

- **Job scraping tasks**: Dispatched via Bull/Celery
- **Email delivery**: Queue for retry logic
- **PDF generation**: Background processing with webhook callback

### 7.3 Event Bus Patterns

```
┌──────────────┐     JobHarvested     ┌──────────────────┐
│  Job Harvester │────────────────────▶│  Event Bus        │
│  Service       │                     │  (Redis Pub/Sub   │
└──────────────┘                      │   or WebSockets)  │
                                      │                   │
┌──────────────┐     ResumeTailored   │                   │
│  Resume Tailor│────────────────────▶│                   │
│  Service      │                     │                   │
└──────────────┘                      └────────┬──────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────┐
                    │                          │                      │
            ┌───────▼────────┐       ┌─────────▼───────┐    ┌────────▼───────┐
            │  User           │       │  Analytics       │    │  Notification  │
            │  (WebSocket)    │       │  Service         │    │  Service       │
            └────────────────┘       └─────────────────┘    └────────────────┘
```

Events:

| Event                 | Payload                                   | Consumers                          |
| --------------------- | ----------------------------------------- | ---------------------------------- |
| `job.search.complete` | `{ userId, jobs: Job[], searchParams }`   | UI (WebSocket), Analytics          |
| `resume.analyzed`     | `{ jobId, resumeId, score, gaps }`        | UI (WebSocket), Orchestrator       |
| `resume.tailored`     | `{ jobId, resumeId, diff, score }`        | UI (WebSocket), Orchestrator       |
| `outreach.sent`       | `{ applicationId, sentAt, messageId }`    | UI (WebSocket), Analytics, Tracker |
| `outreach.bounced`    | `{ applicationId, error }`                | UI (WebSocket), Tracker            |
| `application.status`  | `{ applicationId, oldStatus, newStatus }` | UI (WebSocket), Analytics          |

---

## 8. Security & Guardrails

### 8.1 AI Guardrails

```
                    ┌──────────────────────────────────────┐
                    │         LLM Output Pipeline           │
                    │                                      │
Resume Text ───────▶│  1. Analyze (score + gaps)          │─────▶ Score
                    │  2. Tailor (rewrite bullets)         │─────▶ Tailored Text
                    │  3. Check Guardrails:                │
                    │     a. Truthfulness Check            │
                    │        - Compare job titles match    │
                    │        - Verify dates unchanged      │
                    │        - Check metrics fit           │
                    │     b. Fabrication Detection         │
                    │        - Known company exists?       │
                    │        - Project names real?         │
                    │        - Certifications valid?       │
                    │     c. Seniority Check               │
                    │        - No title inflation          │
                    │        - Level matches experience    │
                    │     d. Consistency Check             │
                    │        - Timeline logical?           │
                    │        - Skills match domain?        │
                    │  4. Pass/Fail Decision               │
                    │     - All pass → Accept output       │
                    │     - Warning → Accept with flag     │
                    │     - Fail → Reject, return original │
                    └──────────────────────────────────────┘
```

### 8.2 Data Security

| Concern               | Mitigation                                                                           |
| --------------------- | ------------------------------------------------------------------------------------ |
| **Resume PII**        | Parse and mask PII (phone, address, SSN) on upload; never send raw resume to LLM     |
| **Email Credentials** | SMTP credentials stored encrypted at rest; never exposed to frontend                 |
| **API Keys**          | Server-side only; proxied through BFF                                                |
| **Session Data**      | sessionStorage only on frontend (auto-clears on tab close)                           |
| **Outreach Privacy**  | Recipient emails stored hashed for analytics; raw email visible only on preview page |

### 8.3 Outreach Safety

| Safety Feature            | Implementation                                                        |
| ------------------------- | --------------------------------------------------------------------- |
| **Dry-Run Mode**          | Default ON; no real SMTP connection without explicit opt-in           |
| **Human Review Gate**     | Every email must pass preview confirmation before sending             |
| **Volume Caps**           | Hard cap of 5 outreach per run (configurable via env)                 |
| **Rate Limiting**         | Max 20 emails/hr per user; max 100/day                                |
| **Audit Trail**           | Every send attempt logged to DB with status, timestamp, error message |
| **Template-Only Content** | MVP: no AI-generated email content (post-MVP: human review required)  |
| **Unsubscribe Link**      | Required in every email HTML                                          |

---

## 9. Error Handling & Resilience

### 9.1 Retry Strategy

| Operation         | Max Retries | Backoff                | Circuit Breaker                |
| ----------------- | ----------- | ---------------------- | ------------------------------ |
| LLM API call      | 3           | Exponential (1s → 10s) | Yes (5 failures / 60s window)  |
| SMTP send         | 3           | Linear (30s)           | Yes (3 failures / 5min window) |
| Job source scrape | 2           | Exponential (5s → 30s) | Per-source (2 failures → skip) |
| DB write          | 2           | Immediate              | No                             |
| PDF generation    | 2           | Linear (10s)           | No                             |

### 9.2 Error Response Format

All API errors follow a consistent schema:

```typescript
interface ApiError {
  code: string; // e.g. "LLM_TIMEOUT", "SMTP_AUTH_FAILED"
  message: string; // Human-readable summary
  details?: Record<string, unknown>; // Additional context
  retryable: boolean; // Client can retry?
  requestId: string; // For tracing
}
```

### 9.3 Graceful Degradation

| Component Failure    | Fallback                                                                    |
| -------------------- | --------------------------------------------------------------------------- |
| LLM unavailable      | Use cached results; if none, show "AI unavailable" with manual input option |
| Job source down      | Skip source, continue with others; notify user                              |
| SMTP down            | Save as draft; retry on next run                                            |
| PDF generation fails | Offer text-only download                                                    |
| DB connection lost   | Return cached data from Redis                                               |

---

## 10. State Management

### 10.1 Frontend State

```typescript
// Zustand stores (or React Context)
interface AppState {
  // User
  user: User | null;
  preferences: UserPreferences;

  // Job Discovery
  currentJobs: Job[];
  selectedJob: Job | null;
  searchFilters: SearchFilters;
  savedJobs: Set<string>;

  // Resume Studio
  uploadedResume: Resume | null;
  currentAnalysis: MatchResult | null;
  currentTailor: TailorResult | null;

  // Pipeline
  currentApplication: Application | null;
  pipelineState: PipelineState;

  // Outreach
  currentDraft: EmailDraft | null;
  sentLogs: OutreachLog[];
  outreachStats: OutreachStats;

  // UI
  toastQueue: Toast[];
  modals: Set<string>;
  loading: LoadingState;
}
```

### 10.2 Server State (Redis)

| Key Pattern                      | TTL | Value                                      |
| -------------------------------- | --- | ------------------------------------------ |
| `session:{userId}`               | 24h | `{ userId, preferences, currentPipeline }` |
| `jobsearch:{userId}:{queryHash}` | 1h  | `{ jobs: Job[] }`                          |
| `llm_cache:{inputHash}`          | 24h | `{ output, model, timestamp }`             |
| `ratelimit:{userId}:{action}`    | 1h  | `{ count, resetAt }`                       |

---

## 11. Deployment Architecture

### 11.1 Container Strategy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Kubernetes Cluster                               │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  Frontend     │  │  API Gateway  │  │  Job          │  │  The       │  │
│  │  (Next.js)    │  │  (Next.js    │  │  Harvester    │  │  Closer    │  │
│  │               │  │   API)       │  │  (FastAPI)    │  │  (FastAPI) │  │
│  │  Replicas: 2  │  │  Replicas: 2 │  │  Replicas: 1  │  │  Replicas:1│  │
│  │  HPA: CPU>70% │  │  HPA: req/s  │  │  HPA: queue   │  │  (queue)   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬─────┘  │
│         │                 │                 │                 │         │
│    ┌────┴─────────────────┴─────────────────┴─────────────────┴────┐   │
│    │                        Service Mesh (Istio/Linkerd)            │   │
│    └───────────────────────────────────────────────────────────────┘   │
│         │                 │                 │                          │
│    ┌────┴─────────────────┴─────────────────┴────────────────────┐    │
│    │                     Ingress (NGINX/Traefik)                    │    │
│    └──────────────────────────────┬────────────────────────────────┘    │
│                                   │                                     │
│    ┌──────────────────────────────▼────────────────────────────────┐    │
│    │                      Persistent Volumes                        │    │
│    │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐  │    │
│    │  │  PostgreSQL   │  │  Redis        │  │  S3-compatible      │  │    │
│    │  │  (StatefulSet)│  │  (StatefulSet)│  │  (MinIO/Cloud)      │  │    │
│    │  │  Replicas: 1  │  │  Replicas: 2 │  │  (File Storage)     │  │    │
│    │  └──────────────┘  └──────────────┘  └─────────────────────┘  │    │
│    └────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### 11.2 Environment Configuration

```typescript
interface EnvConfig {
  // Database
  DATABASE_URL: string;
  REDIS_URL: string;
  STORAGE_BUCKET: string; // S3 bucket or local path

  // LLM
  GROQ_API_KEY: string;
  LLM_MODEL: string; // default: "llama-3.3-70b-versatile"
  LLM_TIMEOUT_MS: number; // 30000
  LLM_CACHE_ENABLED: boolean; // true

  // SMTP
  SMTP_HOST: string;
  SMTP_PORT: number; // 587
  SMTP_USER: string;
  SMTP_PASSWORD: string;

  // Outreach
  DRY_RUN: boolean; // default: true
  MAX_OUTREACH_PER_RUN: number; // 5
  RATE_LIMIT_EMAILS_PER_HOUR: number; // 20

  // Feature Flags
  MOCK_MODE: boolean; // for UI testing without API
  ENABLE_URL_SCRAPE: boolean; // post-MVP feature
  ENABLE_TRACKING_PIXEL: boolean; // email open tracking
}
```

### 11.3 CI/CD Pipeline

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Commit   │───▶│  Lint    │───▶│  Test    │───▶│  Build   │───▶│  Deploy  │
│  (PR to   │    │  + Type  │    │          │    │  + Tag   │    │  (Rolling│
│   main)   │    │  Check   │    │          │    │  Image   │    │  Update) │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                      │
                                                      ▼
                                              ┌──────────────┐
                                              │  Update Helm  │
                                              │  Chart        │
                                              └──────────────┘
```

---

## 12. Testing Strategy

| Layer           | Tool                      | Coverage       | Key Tests                                                                    |
| --------------- | ------------------------- | -------------- | ---------------------------------------------------------------------------- |
| **Unit**        | Vitest (TS), pytest (Py)  | 90%+           | Service functions, prompt templates, Zod validators, guardrails              |
| **Integration** | Supertest, pytest-asyncio | 80%+           | API endpoints, DB queries, LLM client (mocked)                               |
| **E2E**         | Playwright                | Key flows only | Full pipeline: search → tailor → send                                        |
| **LLM**         | VCR-style recording       | Critical paths | Prompt outputs match expected schema; deterministic assertions on guardrails |
| **Visual**      | Percy / Playwright        | UI components  | Diff viewer, email preview, resume render                                    |
| **Performance** | k6                        | API endpoints  | P95 < 500ms for BFF, 30s for LLM                                             |
| **Security**    | OWASP ZAP (phase 2)       | Auth endpoints | XSS, CSRF, rate limiting bypass                                              |

---

## 13. Performance Budgets

| Metric                  | Target                | Measurement          |
| ----------------------- | --------------------- | -------------------- |
| Initial page load (LCP) | < 2s                  | Lighthouse           |
| Job search results      | < 5s                  | Real user monitoring |
| Resume analysis         | < 15s (including LLM) | Server-side timing   |
| Resume tailoring        | < 30s (including LLM) | Server-side timing   |
| Email generation        | < 15s                 | Server-side timing   |
| PDF export              | < 5s                  | Server-side timing   |
| API response (non-LLM)  | < 200ms P95           | APM                  |
| DB query (indexed)      | < 50ms P95            | Query profiling      |

---

## 14. Monitoring & Observability

| Aspect      | Tool                 | Metrics                                                                                        |
| ----------- | -------------------- | ---------------------------------------------------------------------------------------------- |
| **Logs**    | CloudWatch / Loki    | Structured JSON logs with `requestId`, `userId`, `service`                                     |
| **Metrics** | Prometheus + Grafana | Request rate, error rate, latency P50/P95/P99, LLM token usage, queue depth, SMTP success rate |
| **Traces**  | OpenTelemetry        | End-to-end request tracing across services                                                     |
| **Alerts**  | PagerDuty / Slack    | LLM error rate > 5%, SMTP failure rate > 10%, DB connection pool exhaustion, queue backlog     |

---

## 15. Extensibility Points

| Extension Point      | Interface                         | Example                                  |
| -------------------- | --------------------------------- | ---------------------------------------- |
| **Job Source**       | `JobSourceAdapter` abstract class | Add LinkedIn, Indeed, Glassdoor          |
| **LLM Provider**     | `LLMProvider` interface           | Add OpenAI, Anthropic, Ollama            |
| **Email Provider**   | `EmailSender` interface           | Add SendGrid, Postmark, AWS SES          |
| **Storage Provider** | `FileStore` interface             | Add Google Cloud Storage, Azure Blob     |
| **Parser**           | `ResumeParser` interface          | Add LaTeX, markdown, JSON resume formats |

```typescript
// Example: Adding a new job source
class LinkedInAdapter implements JobSourceAdapter {
  sourceName = 'linkedin';
  async search(params: SearchParams): Promise<RawJobListing[]> {
    /* ... */
  }
  async normalize(raw: RawJobListing): Promise<NormalizedJob> {
    /* ... */
  }
}
```

---

## 16. Implementation Roadmap

| Phase                  | Focus                                      | Deliverables                                                                 |
| ---------------------- | ------------------------------------------ | ---------------------------------------------------------------------------- |
| **P0 — Foundation**    | Core infrastructure, DB, auth              | PostgreSQL schema, REST API skeleton, user auth, file upload                 |
| **P1 — Job Harvester** | Job aggregation pipeline                   | Source adapters (Naukri, RemoteOK, Wellfound), dedup, filter, CSV export     |
| **P2 — Resume Tailor** | AI-powered resume optimization             | LLM integration, prompt templates, guardrails, PDF export, side-by-side diff |
| **P3 — The Closer**    | Cold email outreach                        | Email generation, SMTP integration, preview engine, audit log, volume caps   |
| **P4 — Integration**   | Connect all services into unified platform | Pipeline orchestrator, application tracking, unified dashboard               |
| **P5 — Polish**        | Scale, security, UX                        | Performance optimization, rate limiting, error handling, mobile responsive   |
