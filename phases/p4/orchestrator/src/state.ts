/**
 * State persistence — saves pipeline context to persistent storage.
 *
 * In production this uses Redis. For development it uses in-memory storage
 * with periodic cleanup of abandoned pipelines.
 */

import type { PipelineContext } from "./pipeline";

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Save pipeline context (pass-through for in-memory; Redis in production).
 */
export function persistState(ctx: PipelineContext): void {
  // P4: await redis.set(`pipeline:${ctx.pipelineId}`, JSON.stringify(ctx), { EX: 86400 });
}

/**
 * Recover pipeline state on restart.
 * Returns stale pipelines that should be retried by the error recovery module.
 */
export function recoverOnRestart(): PipelineContext[] {
  // P4: scan Redis for pipelines with state !== "completed" | "failed"
  return [];
}

/**
 * Clean up abandoned pipelines (no activity for > 24h).
 */
export function cleanupAbandoned(activePipelines: PipelineContext[]): number {
  const now = Date.now();
  let cleaned = 0;
  for (const ctx of activePipelines) {
    if (
      ctx.state !== "completed" &&
      ctx.state !== "failed" &&
      now - ctx.updatedAt.getTime() > TTL_MS
    ) {
      ctx.state = "failed";
      ctx.error = "Pipeline abandoned — no activity for 24 hours";
      cleaned++;
    }
  }
  return cleaned;
}