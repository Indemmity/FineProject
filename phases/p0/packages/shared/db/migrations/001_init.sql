-- P0.2 — Initial Schema
-- Creates all 6 core tables with indexes, constraints, and enums.

-- ─── Enums ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE application_status AS ENUM (
    'discovered', 'analyzed', 'tailored', 'outreach_sent',
    'applied', 'interview', 'offer', 'rejected', 'closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE outreach_status AS ENUM (
    'draft', 'previewed', 'sent', 'failed', 'bounced', 'replied'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE job_source AS ENUM ('naukri', 'remoteok', 'wellfound');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE job_type AS ENUM ('full-time', 'part-time', 'contract', 'internship');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE experience_level AS ENUM ('entry', 'mid', 'senior', 'lead');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Users ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL DEFAULT '',
  preferences JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users (email);

-- ─── Jobs ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source           job_source NOT NULL,
  source_id        TEXT NOT NULL,
  title            TEXT NOT NULL,
  company          TEXT NOT NULL,
  location         TEXT,
  description      TEXT NOT NULL DEFAULT '',
  description_html TEXT NOT NULL DEFAULT '',
  salary_range     TEXT,
  job_type         job_type,
  remote           BOOLEAN NOT NULL DEFAULT false,
  experience_level experience_level,
  posted_date      TIMESTAMPTZ,
  url              TEXT NOT NULL DEFAULT '',
  search_keyword   TEXT NOT NULL DEFAULT '',
  scraped_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw              JSONB NOT NULL DEFAULT '{}',

  CONSTRAINT uq_job_source UNIQUE (source, source_id)
);

CREATE INDEX idx_jobs_source        ON jobs (source);
CREATE INDEX idx_jobs_posted_date   ON jobs (posted_date DESC);
CREATE INDEX idx_jobs_company       ON jobs (company);
CREATE INDEX idx_jobs_search_keyword ON jobs (search_keyword);

-- ─── Resumes ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resumes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_file_path TEXT NOT NULL,
  parsed_text      TEXT NOT NULL DEFAULT '',
  tailored_text    JSONB NOT NULL DEFAULT '{}',
  match_score      INTEGER CHECK (match_score >= 0 AND match_score <= 100),
  gap_analysis     JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_resumes_user_id ON resumes (user_id);
CREATE INDEX idx_resumes_created_at ON resumes (created_at DESC);

-- ─── Applications ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS applications (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id             UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  resume_id          UUID REFERENCES resumes(id) ON DELETE SET NULL,
  status             application_status NOT NULL DEFAULT 'discovered',
  match_score        INTEGER CHECK (match_score >= 0 AND match_score <= 100),
  gap_analysis       JSONB,
  tailored_resume_text TEXT,
  cover_letter_text  TEXT,
  applied_at         TIMESTAMPTZ,
  notes              TEXT NOT NULL DEFAULT ''
);

CREATE INDEX idx_applications_user_id ON applications (user_id);
CREATE INDEX idx_applications_job_id  ON applications (job_id);
CREATE INDEX idx_applications_status  ON applications (status);
CREATE INDEX idx_applications_applied_at ON applications (applied_at DESC);

-- ─── Timeline Events ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS timeline_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  event           TEXT NOT NULL,
  detail          TEXT NOT NULL DEFAULT '',
  source          TEXT NOT NULL DEFAULT 'system',
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_timeline_application_id ON timeline_events (application_id);
CREATE INDEX idx_timeline_timestamp      ON timeline_events (timestamp DESC);

-- ─── Outreach Logs ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS outreach_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id   UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  status           outreach_status NOT NULL DEFAULT 'draft',
  recipient_email  TEXT NOT NULL,
  recipient_name   TEXT NOT NULL DEFAULT '',
  subject          TEXT NOT NULL DEFAULT '',
  body_html        TEXT NOT NULL DEFAULT '',
  body_text        TEXT NOT NULL DEFAULT '',
  sent_at          TIMESTAMPTZ,
  delivery_status  TEXT NOT NULL DEFAULT 'pending',
  opened_at        TIMESTAMPTZ,
  replied_at       TIMESTAMPTZ,
  error_message    TEXT,
  attachments      JSONB NOT NULL DEFAULT '[]'
);

CREATE INDEX idx_outreach_application_id ON outreach_logs (application_id);
CREATE INDEX idx_outreach_status         ON outreach_logs (status);
CREATE INDEX idx_outreach_sent_at        ON outreach_logs (sent_at DESC);