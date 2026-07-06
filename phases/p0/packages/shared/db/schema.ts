import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

// ─── Enums (as const) ───────────────────────────────────────────────────────
export const applicationStatus = [
  'discovered',
  'analyzed',
  'tailored',
  'outreach_sent',
  'applied',
  'interview',
  'offer',
  'rejected',
  'closed',
] as const;

export const outreachStatus = [
  'draft',
  'previewed',
  'sent',
  'failed',
  'bounced',
  'replied',
] as const;

export const jobSources = ['naukri', 'remoteok', 'wellfound'] as const;
export const jobTypes = ['full-time', 'part-time', 'contract', 'internship'] as const;
export const experienceLevels = ['entry', 'mid', 'senior', 'lead'] as const;

// ─── Users ──────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull().default(''),
  preferences: jsonb('preferences').notNull().default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Jobs ───────────────────────────────────────────────────────────────────
export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    source: text('source').notNull(),
    sourceId: text('source_id').notNull(),
    title: text('title').notNull(),
    company: text('company').notNull(),
    location: text('location'),
    description: text('description').notNull().default(''),
    descriptionHtml: text('description_html').notNull().default(''),
    salaryRange: text('salary_range'),
    jobType: text('job_type'),
    remote: boolean('remote').notNull().default(false),
    experienceLevel: text('experience_level'),
    postedDate: timestamp('posted_date', { withTimezone: true }),
    url: text('url').notNull().default(''),
    searchKeyword: text('search_keyword').notNull().default(''),
    scrapedAt: timestamp('scraped_at', { withTimezone: true }).defaultNow().notNull(),
    raw: jsonb('raw').notNull().default('{}'),
  },
  (table) => ({
    sourceUniq: uniqueIndex('uq_job_source').on(table.source, table.sourceId),
    sourceIdx: index('idx_jobs_source').on(table.source),
    postedDateIdx: index('idx_jobs_posted_date').on(table.postedDate),
  }),
);

// ─── Resumes ────────────────────────────────────────────────────────────────
export const resumes = pgTable(
  'resumes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    originalFilePath: text('original_file_path').notNull(),
    originalFileContent: text('original_file_content'), // base64 encoded original file
    parsedText: text('parsed_text').notNull().default(''),
    tailoredText: jsonb('tailored_text').notNull().default('{}'),
    matchScore: integer('match_score'),
    gapAnalysis: jsonb('gap_analysis'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('idx_resumes_user_id').on(table.userId),
  }),
);

// ─── Applications ───────────────────────────────────────────────────────────
export const applications = pgTable(
  'applications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    resumeId: uuid('resume_id').references(() => resumes.id, { onDelete: 'set null' }),
    status: text('status').notNull().default('discovered'),
    matchScore: integer('match_score'),
    gapAnalysis: jsonb('gap_analysis'),
    tailoredResumeText: text('tailored_resume_text'),
    coverLetterText: text('cover_letter_text'),
    appliedAt: timestamp('applied_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    notes: text('notes').notNull().default(''),
  },
  (table) => ({
    userIdIdx: index('idx_applications_user_id').on(table.userId),
    jobIdIdx: index('idx_applications_job_id').on(table.jobId),
    statusIdx: index('idx_applications_status').on(table.status),
  }),
);

// ─── Timeline Events ────────────────────────────────────────────────────────
export const timelineEvents = pgTable(
  'timeline_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
    event: text('event').notNull(),
    detail: text('detail').notNull().default(''),
    source: text('source').notNull().default('system'),
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    appIdx: index('idx_timeline_application_id').on(table.applicationId),
  }),
);

// ─── Outreach Logs ──────────────────────────────────────────────────────────
export const outreachLogs = pgTable(
  'outreach_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('draft'),
    recipientEmail: text('recipient_email').notNull(),
    recipientName: text('recipient_name').notNull().default(''),
    subject: text('subject').notNull().default(''),
    bodyHtml: text('body_html').notNull().default(''),
    bodyText: text('body_text').notNull().default(''),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    deliveryStatus: text('delivery_status').notNull().default('pending'),
    openedAt: timestamp('opened_at', { withTimezone: true }),
    repliedAt: timestamp('replied_at', { withTimezone: true }),
    errorMessage: text('error_message'),
    attachments: jsonb('attachments').notNull().default('[]'),
  },
  (table) => ({
    appIdx: index('idx_outreach_application_id').on(table.applicationId),
    statusIdx: index('idx_outreach_status').on(table.status),
  }),
);
