import { z } from 'zod';

// ─── Job ───────────────────────────────────────────────────────────────────
export const JobSchema = z.object({
  id: z.string().uuid(),
  source: z.enum(['naukri', 'remoteok', 'wellfound']),
  sourceId: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string().nullable(),
  description: z.string(),
  descriptionHtml: z.string(),
  salaryRange: z.string().nullable(),
  jobType: z.enum(['full-time', 'part-time', 'contract', 'internship']).nullable(),
  remote: z.boolean(),
  experienceLevel: z.enum(['entry', 'mid', 'senior', 'lead']).nullable(),
  postedDate: z.string().datetime(),
  url: z.string().url(),
  searchKeyword: z.string(),
  scrapedAt: z.string().datetime(),
  raw: z.record(z.unknown()),
});

export type Job = z.infer<typeof JobSchema>;

// ─── Resume ────────────────────────────────────────────────────────────────
export const ResumeSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  originalFilePath: z.string(),
  parsedText: z.string(),
  tailoredText: z.record(z.string()).optional(),
  matchScore: z.number().min(0).max(100).nullable(),
  gapAnalysis: z.array(z.unknown()).nullable(),
  createdAt: z.string().datetime(),
});

export type Resume = z.infer<typeof ResumeSchema>;

// ─── Application ───────────────────────────────────────────────────────────
export const ApplicationStatusEnum = z.enum([
  'discovered',
  'analyzed',
  'tailored',
  'outreach_sent',
  'applied',
  'interview',
  'offer',
  'rejected',
  'closed',
]);

export const GapItemSchema = z.object({
  skill: z.string(),
  importance: z.enum(['high', 'medium', 'low']),
  category: z.enum(['technical', 'domain', 'soft_skill', 'education']),
  suggestedAction: z.string(),
});

export const TimelineEventSchema = z.object({
  timestamp: z.string().datetime(),
  event: z.string(),
  detail: z.string(),
  source: z.enum(['system', 'user']),
});

export const ApplicationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  jobId: z.string().uuid(),
  resumeId: z.string().uuid(),
  status: ApplicationStatusEnum,
  matchScore: z.number().min(0).max(100).nullable(),
  gapAnalysis: z.array(GapItemSchema).nullable(),
  tailoredResumeText: z.string().nullable(),
  coverLetterText: z.string().nullable(),
  appliedAt: z.string().datetime().nullable(),
  notes: z.string(),
  timeline: z.array(TimelineEventSchema),
});

export type Application = z.infer<typeof ApplicationSchema>;
export type GapItem = z.infer<typeof GapItemSchema>;
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
export type ApplicationStatus = z.infer<typeof ApplicationStatusEnum>;

// ─── Outreach ──────────────────────────────────────────────────────────────
export const OutreachStatusEnum = z.enum([
  'draft',
  'previewed',
  'sent',
  'failed',
  'bounced',
  'replied',
]);

export const OutreachLogSchema = z.object({
  id: z.string().uuid(),
  applicationId: z.string().uuid(),
  status: OutreachStatusEnum,
  recipientEmail: z.string().email(),
  recipientName: z.string(),
  subject: z.string(),
  bodyHtml: z.string(),
  bodyText: z.string(),
  sentAt: z.string().datetime().nullable(),
  deliveryStatus: z.string(),
  openedAt: z.string().datetime().nullable(),
  repliedAt: z.string().datetime().nullable(),
  errorMessage: z.string().nullable(),
  attachments: z.array(z.string()),
});

export type OutreachLog = z.infer<typeof OutreachLogSchema>;
export type OutreachStatus = z.infer<typeof OutreachStatusEnum>;

// ─── API Errors ────────────────────────────────────────────────────────────
export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
  retryable: z.boolean(),
  requestId: z.string(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

// ─── LLM Config ────────────────────────────────────────────────────────────
export const LLMConfigSchema = z.object({
  model: z.string(),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().positive(),
  retry: z.object({
    maxAttempts: z.number().positive(),
    backoffMs: z.number().positive(),
    maxBackoffMs: z.number().positive(),
  }),
  cacheTtlMs: z.number().positive(),
  timeoutMs: z.number().positive(),
});

export type LLMConfig = z.infer<typeof LLMConfigSchema>;

// ─── Pipeline ──────────────────────────────────────────────────────────────
export const PipelineStateEnum = z.enum([
  'searching_jobs',
  'jobs_found',
  'resume_uploaded',
  'analyzing_match',
  'tailoring_resume',
  'guardrail_checking',
  'ready_for_review',
  'generating_outreach',
  'outreach_preview',
  'outreach_sent',
  'completed',
]);

export type PipelineState = z.infer<typeof PipelineStateEnum>;

export const PipelineContextSchema = z.object({
  userId: z.string().uuid(),
  jobId: z.string().uuid().nullable(),
  resumeId: z.string().uuid().nullable(),
  applicationId: z.string().uuid().nullable(),
  outreachId: z.string().uuid().nullable(),
  state: PipelineStateEnum,
  errors: z.array(z.string()),
  metadata: z.record(z.unknown()),
});

export type PipelineContext = z.infer<typeof PipelineContextSchema>;

// ─── User Preferences ──────────────────────────────────────────────────────
export const UserPreferencesSchema = z.object({
  defaultLocation: z.string().optional(),
  defaultRemoteOnly: z.boolean().optional(),
  defaultExperienceLevel: z.enum(['entry', 'mid', 'senior', 'lead']).optional(),
  defaultSources: z.array(z.enum(['naukri', 'remoteok', 'wellfound'])).optional(),
  emailSignature: z.string().optional(),
});

export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

// ─── Search ────────────────────────────────────────────────────────────────
export const SearchParamsSchema = z.object({
  keywords: z.array(z.string().min(1).max(200)).min(1).max(10),
  location: z.string().optional(),
  remoteOnly: z.boolean().optional(),
  experienceLevel: z.enum(['entry', 'mid', 'senior', 'lead']).optional(),
  datePosted: z.number().positive().optional(),
  sources: z.array(z.enum(['naukri', 'remoteok', 'wellfound'])).optional(),
});

export type SearchParams = z.infer<typeof SearchParamsSchema>;
