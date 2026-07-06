/**
 * Error recovery — retries failed steps and handles unrecoverable errors.
 */

import type { PipelineContext, PipelineState } from "./pipeline";
import { transitionTo } from "./pipeline";

const MAX_RETRIES = 3;
const RETRYABLE_STATES: PipelineState[] = [
  "searching_jobs",
  "analyzing_match",
  "tailoring_resume",
  "guardrail_checking",
  "generating_outreach",
];

/**
 * Attempt to recover a failed pipeline by retrying the last step.
 * Returns the updated context or undefined if recovery is not possible.
 */
export function recoverPipeline(ctx: PipelineContext): PipelineContext | null {
  if (!RETRYABLE_STATES.includes(ctx.state)) {
    return null; // non-retryable state
  }

  const retries = ((ctx as unknown as Record<string, unknown>)._retries ?? 0) as number;
  if (retries >= MAX_RETRIES) {
    return null; // max retries exceeded
  }

  // Retry: transition back to the same state to trigger re-execution
  const updated = transitionTo(ctx.pipelineId, ctx.state);
  (updated as unknown as Record<string, unknown>)._retries = retries + 1;
  updated.error = undefined;
  return updated;
}

/**
 * Get a user-friendly error message for a failed pipeline step.
 */
export function getErrorMessage(state: PipelineState, error?: string): string {
  const messages: Partial<Record<PipelineState, string>> = {
    searching_jobs: "Failed to search for jobs. Check your search sources and try again.",
    analyzing_match: "Failed to analyze resume match. Please try again.",
    tailoring_resume: "Failed to tailor resume. Please try again.",
    guardrail_checking: "Guardrail check failed. Review the changes and try again.",
    generating_outreach: "Failed to generate outreach email. Please try again.",
    outreach_sent: "Failed to send email. Check SMTP configuration.",
  };

  const base = messages[state] ?? "An unexpected error occurred.";
  return error ? `${base} Details: ${error}` : base;
}