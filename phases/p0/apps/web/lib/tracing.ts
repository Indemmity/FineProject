/**
 * Distributed tracing — propagates trace context across service boundaries.
 *
 * Uses OpenTelemetry-compatible trace IDs via HTTP headers.
 */

import { randomUUID } from "node:crypto";

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
}

export function createTrace(): TraceContext {
  return {
    traceId: randomUUID().replace(/-/g, ""),
    spanId: randomUUID().replace(/-/g, "").slice(0, 16),
  };
}

export function createChildSpan(parent: TraceContext): TraceContext {
  return {
    traceId: parent.traceId,
    spanId: randomUUID().replace(/-/g, "").slice(0, 16),
    parentSpanId: parent.spanId,
  };
}

export function headerToTrace(
  traceHeader?: string | null,
  spanHeader?: string | null,
): TraceContext | null {
  if (!traceHeader) return null;
  return {
    traceId: traceHeader,
    spanId: spanHeader ?? randomUUID().replace(/-/g, "").slice(0, 16),
  };
}

export function traceToHeaders(ctx: TraceContext): Record<string, string> {
  return {
    "x-trace-id": ctx.traceId,
    "x-span-id": ctx.spanId,
    "x-parent-span-id": ctx.parentSpanId ?? "",
  };
}

export function recordSpan(ctx: TraceContext, name: string, durationMs: number): void {
  if (process.env.NODE_ENV === "development") {
    console.log(
      JSON.stringify({
        type: "span",
        traceId: ctx.traceId,
        spanId: ctx.spanId,
        parentSpanId: ctx.parentSpanId,
        name,
        durationMs,
        timestamp: new Date().toISOString(),
      }),
    );
  }
}