/**
 * Enhanced health check endpoint — returns status of all service dependencies.
 *
 * Used by Docker/K8s liveness and readiness probes.
 */

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  service: string;
  version: string;
  uptime: number;
  checks: Record<string, { status: string; latency?: number; error?: string }>;
}

const startTime = Date.now();

export function getHealth(): HealthStatus {
  const checks: HealthStatus["checks"] = {
    server: { status: "ok" },
  };

  // DB check (stub)
  checks.database = { status: process.env.DATABASE_URL ? "ok" : "not_configured" };

  // Redis check (stub)
  checks.redis = { status: process.env.REDIS_URL ? "ok" : "not_configured" };

  // LLM check (stub)
  checks.llm = { status: process.env.GROQ_API_KEY ? "ok" : "not_configured" };

  const allOk = Object.values(checks).every((c) => c.status === "ok");
  const anyDown = Object.values(checks).some((c) => c.status === "error");

  return {
    status: anyDown ? "unhealthy" : allOk ? "healthy" : "degraded",
    service: process.env.SERVICE_NAME ?? "web",
    version: "0.1.0",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
  };
}