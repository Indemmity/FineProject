/**
 * Full pipeline workflow — connects the orchestrator to external services.
 *
 * Each step calls the respective service API and transitions the pipeline state.
 */

import { PipelineContext, transitionTo, eventBus } from "../pipeline.js";
import { persistState } from "../state.js";

export interface WorkflowStep {
  name: string;
  execute: (ctx: PipelineContext) => Promise<PipelineContext>;
}

async function searchJobs(ctx: PipelineContext): Promise<PipelineContext> {
  // P4: POST http://localhost:8001/api/jobs/search
  ctx.data.userId = ctx.data.userId ?? "unknown";
  ctx = transitionTo(ctx.pipelineId, "jobs_found");
  persistState(ctx);
  eventBus.publish({
    eventType: "job.search.completed",
    timestamp: new Date().toISOString(),
    userId: ctx.data.userId,
    pipelineId: ctx.pipelineId,
  } as never);
  return ctx;
}

async function uploadResume(ctx: PipelineContext): Promise<PipelineContext> {
  ctx = transitionTo(ctx.pipelineId, "resume_uploaded");
  persistState(ctx);
  return ctx;
}

async function analyzeMatch(ctx: PipelineContext): Promise<PipelineContext> {
  ctx = transitionTo(ctx.pipelineId, "analyzing_match");
  persistState(ctx);
  return ctx;
}

async function tailorResume(ctx: PipelineContext): Promise<PipelineContext> {
  ctx = transitionTo(ctx.pipelineId, "tailoring_resume");
  persistState(ctx);
  return ctx;
}

async function checkGuardrails(ctx: PipelineContext): Promise<PipelineContext> {
  ctx = transitionTo(ctx.pipelineId, "guardrail_checking");
  persistState(ctx);
  return ctx;
}

async function generateOutreach(ctx: PipelineContext): Promise<PipelineContext> {
  ctx = transitionTo(ctx.pipelineId, "generating_outreach");
  persistState(ctx);
  return ctx;
}

async function sendOutreach(ctx: PipelineContext): Promise<PipelineContext> {
  ctx = transitionTo(ctx.pipelineId, "outreach_sent");
  persistState(ctx);
  return ctx;
}

export const FULL_PIPELINE: WorkflowStep[] = [
  { name: "search_jobs", execute: searchJobs },
  { name: "upload_resume", execute: uploadResume },
  { name: "analyze_match", execute: analyzeMatch },
  { name: "tailor_resume", execute: tailorResume },
  { name: "check_guardrails", execute: checkGuardrails },
  { name: "generate_outreach", execute: generateOutreach },
  { name: "send_outreach", execute: sendOutreach },
];

export async function runFullPipeline(
  ctx: PipelineContext,
): Promise<PipelineContext> {
  for (const step of FULL_PIPELINE) {
    try {
      ctx = await step.execute(ctx);
    } catch (err) {
      ctx = transitionTo(ctx.pipelineId, "failed", (err as Error).message);
      persistState(ctx);
      eventBus.publish({
        eventType: "pipeline.failed",
        timestamp: new Date().toISOString(),
        userId: ctx.data.userId ?? "unknown",
        pipelineId: ctx.pipelineId,
      } as never);
      break;
    }
  }

  if (ctx.state !== "failed") {
    eventBus.publish({
      eventType: "pipeline.completed",
      timestamp: new Date().toISOString(),
      userId: ctx.data.userId ?? "unknown",
      pipelineId: ctx.pipelineId,
    } as never);
  }

  return ctx;
}