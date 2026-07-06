/**
 * Pipeline state machine — manages pipeline lifecycle.
 *
 * States: searching_jobs → jobs_found → resume_uploaded → analyzing_match →
 *         tailoring_resume → guardrail_checking → ready_for_review →
 *         generating_outreach → outreach_preview → outreach_sent → completed
 */

import { randomUUID } from "node:crypto";

// ─── Simple in-process event bus ────────────────────────────────────────────
type EventHandler2 = (event: unknown) => void;

export const eventBus = {
  _handlers: new Map<string, Set<EventHandler2>>(),

  on(eventType: string, handler: EventHandler2) {
    if (!this._handlers.has(eventType)) {
      this._handlers.set(eventType, new Set());
    }
    this._handlers.get(eventType)!.add(handler);
  },

  publish(event: Record<string, unknown>) {
    const eventType = event.eventType as string;
    const handlers = this._handlers.get(eventType);
    if (handlers) {
      for (const h of handlers) {
        try {
          h(event);
        } catch {
          // swallow
        }
      }
    }
  },
};

// ─── Pipeline Types & State Machine ─────────────────────────────────────────

export type PipelineState =
  | "idle"
  | "searching_jobs"
  | "jobs_found"
  | "resume_uploaded"
  | "analyzing_match"
  | "tailoring_resume"
  | "guardrail_checking"
  | "ready_for_review"
  | "generating_outreach"
  | "outreach_preview"
  | "outreach_sent"
  | "completed"
  | "failed";

export interface PipelineContext {
  pipelineId: string;
  state: PipelineState;
  createdAt: Date;
  updatedAt: Date;
  error?: string;
  data: {
    searchId?: string;
    jobId?: string;
    resumeId?: string;
    tailoredResumeId?: string;
    outreachId?: string;
    userId?: string;
  };
}

const VALID_TRANSITIONS: Record<PipelineState, PipelineState[]> = {
  idle: ["searching_jobs"],
  searching_jobs: ["jobs_found", "failed"],
  jobs_found: ["resume_uploaded", "searching_jobs"],
  resume_uploaded: ["analyzing_match", "failed"],
  analyzing_match: ["tailoring_resume", "failed"],
  tailoring_resume: ["guardrail_checking", "failed"],
  guardrail_checking: ["ready_for_review", "failed"],
  ready_for_review: ["generating_outreach", "tailoring_resume"],
  generating_outreach: ["outreach_preview", "failed"],
  outreach_preview: ["outreach_sent", "generating_outreach"],
  outreach_sent: ["completed"],
  completed: [],
  failed: ["searching_jobs", "resume_uploaded"],
};

const pipelines = new Map<string, PipelineContext>();

export function createPipeline(): PipelineContext {
  const ctx: PipelineContext = {
    pipelineId: randomUUID(),
    state: "idle",
    createdAt: new Date(),
    updatedAt: new Date(),
    data: {},
  };
  pipelines.set(ctx.pipelineId, ctx);
  return ctx;
}

export function getPipeline(id: string): PipelineContext | undefined {
  return pipelines.get(id);
}

export function transitionTo(
  pipelineId: string,
  next: PipelineState,
  error?: string,
): PipelineContext {
  const ctx = pipelines.get(pipelineId);
  if (!ctx) throw new Error(`Pipeline ${pipelineId} not found`);

  const allowed = VALID_TRANSITIONS[ctx.state];
  if (!allowed.includes(next)) {
    throw new Error(
      `Invalid transition: ${ctx.state} → ${next}. Allowed: ${allowed.join(", ")}`,
    );
  }

  ctx.state = next;
  ctx.updatedAt = new Date();
  if (error) ctx.error = error;
  return ctx;
}

export function listPipelines(): PipelineContext[] {
  return Array.from(pipelines.values());
}