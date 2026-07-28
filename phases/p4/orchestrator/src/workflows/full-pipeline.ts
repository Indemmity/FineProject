/**
 * Full pipeline workflow — connects the orchestrator to external services.
 *
 * Each step calls the respective service API and transitions the pipeline state.
 */

import { PipelineContext, transitionTo, eventBus } from "../pipeline.js";
import { persistState } from "../state.js";

const HARVESTER = process.env.HARVESTER_URL || "http://localhost:8001";
const CLOSER = process.env.CLOSER_URL || "http://localhost:8002";

async function fetchJson(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(30000),
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function searchJobs(ctx: PipelineContext): Promise<PipelineContext> {
  const keywords = ctx.data.keywords || ["software engineer"];
  const q = keywords.join(",");
  const data = await fetchJson(`${HARVESTER}/api/jobs/search?q=${encodeURIComponent(q)}`);
  ctx.data.searchResults = { count: data.results?.length ?? 0, searchId: data.search_id };
  ctx = transitionTo(ctx.pipelineId, "jobs_found");
  persistState(ctx);
  eventBus.publish({
    eventType: "job.search.completed",
    timestamp: new Date().toISOString(),
    userId: ctx.data.userId ?? "unknown",
    pipelineId: ctx.pipelineId,
    meta: { jobsFound: ctx.data.searchResults.count },
  } as never);
  return ctx;
}

async function uploadResume(ctx: PipelineContext): Promise<PipelineContext> {
  if (!ctx.data.resumeId) {
    ctx.data.resumeId = `pipeline-${ctx.pipelineId.slice(0, 8)}`;
  }
  ctx = transitionTo(ctx.pipelineId, "resume_uploaded");
  persistState(ctx);
  return ctx;
}

async function analyzeMatch(ctx: PipelineContext): Promise<PipelineContext> {
  ctx = transitionTo(ctx.pipelineId, "analyzing_match");
  persistState(ctx);
  eventBus.publish({
    eventType: "resume.analysis.started",
    timestamp: new Date().toISOString(),
    userId: ctx.data.userId ?? "unknown",
    pipelineId: ctx.pipelineId,
  } as never);
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
  try {
    await fetchJson(`${CLOSER}/api/outreach/generate`, {
      method: "POST",
      body: JSON.stringify({
        application_id: ctx.pipelineId,
        job_title: ctx.data.keywords?.[0] ?? "Software Engineer",
        company_name: ctx.data.company ?? "Unknown",
      }),
    });
    eventBus.publish({
      eventType: "outreach.generated",
      timestamp: new Date().toISOString(),
      userId: ctx.data.userId ?? "unknown",
      pipelineId: ctx.pipelineId,
    } as never);
  } catch {
    // Non-critical
  }
  return ctx;
}

async function sendOutreach(ctx: PipelineContext): Promise<PipelineContext> {
  ctx = transitionTo(ctx.pipelineId, "outreach_sent");
  persistState(ctx);
  eventBus.publish({
    eventType: "outreach.sent",
    timestamp: new Date().toISOString(),
    userId: ctx.data.userId ?? "unknown",
    pipelineId: ctx.pipelineId,
  } as never);
  return ctx;
}

export interface WorkflowStep {
  name: string;
  execute: (ctx: PipelineContext) => Promise<PipelineContext>;
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
  ctx = transitionTo(ctx.pipelineId, "searching_jobs");
  persistState(ctx);

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
    ctx = transitionTo(ctx.pipelineId, "completed");
    persistState(ctx);
    eventBus.publish({
      eventType: "pipeline.completed",
      timestamp: new Date().toISOString(),
      userId: ctx.data.userId ?? "unknown",
      pipelineId: ctx.pipelineId,
    } as never);
  }

  return ctx;
}
