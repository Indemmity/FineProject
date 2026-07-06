export * from './types';
export { getDb, isDbAvailable, schema } from './db';
export * from './db/schema';

// LLM Client
export { LLMClient, llm } from './lib/llm/client';
export { loadLLMConfig, type EnvLLMConfig } from './lib/llm/config';
export { loadPrompt, renderPrompt, loadCachedPrompt } from './lib/llm/prompts';
export { getCached, setCache, invalidate } from './lib/llm/cache';
export { getMockResponse, isMockMode } from './lib/llm/mock';

// Resume
export { parseResume, extractSections } from './lib/resume/parser';
export type { ParsedResume, ResumeSection } from './lib/resume/parser';

// PDF
export { generatePDF } from './lib/pdf/generator';
export { generateComparisonPDF } from './lib/pdf/comparison';

// Services
export { analyzeResume } from './lib/services/analyzer';
export type { MatchResult, SkillBreakdown } from './lib/services/analyzer';
export { analyzeGaps } from './lib/services/gap-analyzer';
export type { GapItem } from './lib/services/gap-analyzer';
export { tailorResume } from './lib/services/tailor';
export type { TailorResult, TailoredSection } from './lib/services/tailor';
export { computeDiff, countChanges } from './lib/services/diff';
export type { DiffLine } from './lib/services/diff';
export { checkGuardrails } from './lib/services/guardrails';
export type { GuardrailResult, GuardrailIssue } from './lib/services/guardrails';
export { checkTruthfulness } from './lib/services/guardrails/truthfulness';
export { checkFabrication } from './lib/services/guardrails/fabrication';
export { checkSeniority } from './lib/services/guardrails/seniority';

// Event Bus
export { eventBus, connectRedis } from './events/bus';
export type { PlatformEvent, EventHandler } from './events/schemas';

// Application Tracking
export {
  createApplication,
  getApplication,
  updateApplication,
  transitionStatus,
  deleteApplication,
  listApplications,
  getApplicationStats,
} from './lib/services/applications';
export type { Application, ApplicationStatus, TimelineEvent } from './lib/services/applications';
export { getDashboardStats } from './lib/services/stats';
export type { DashboardStats } from './lib/services/stats';

// Security
export { maskPII, restorePII } from './lib/security/pii';
export { sanitizeText, sanitizeFilename, validateFileUpload } from './lib/security/sanitize';
export { generateCsrfToken, validateCsrf } from './lib/security/csrf';

// LLM Warm-up
export { warmUpCache } from './lib/llm/warmup';
