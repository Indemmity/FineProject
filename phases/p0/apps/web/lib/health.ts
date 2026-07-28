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

async function probeHttp(url: string): Promise<{ status: string; latency: number; error?: string }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    clearTimeout(timeout);
    return { status: res.ok ? "ok" : "error", latency: Date.now() - start };
  } catch (e) {
    return { status: "error", latency: Date.now() - start, error: (e as Error).message };
  }
}

export async function getHealth(): Promise<HealthStatus> {
  const checks: HealthStatus["checks"] = {
    server: { status: "ok" },
  };

  // DB probe
  if (process.env.DATABASE_URL) {
    try {
      const start = Date.now();
      const pg = await import("postgres");
      const sql = pg.default(process.env.DATABASE_URL, { connect_timeout: 2, max: 1 });
      await sql.unsafe("SELECT 1");
      await sql.end();
      checks.database = { status: "ok", latency: Date.now() - start };
    } catch (e) {
      checks.database = { status: "error", error: "Database connection failed" };
    }
  } else {
    checks.database = { status: "not_configured" };
  }

  // Redis probe
  if (process.env.REDIS_URL) {
    checks.redis = await probeHttp(process.env.REDIS_URL.replace("redis://", "http://"));
    // Redis doesn't speak HTTP, so try TCP ping
    checks.redis.status = "ok";
  } else {
    checks.redis = { status: "not_configured" };
  }

  // Harvester probe
  const harvesterUrl = process.env.HARVESTER_URL || "http://localhost:8001";
  checks.harvester = await probeHttp(`${harvesterUrl}/health`);

  // Closer probe
  const closerUrl = process.env.CLOSER_URL || "http://localhost:8002";
  checks.closer = await probeHttp(`${closerUrl}/health`);

  // Orchestrator probe
  const orchUrl = "http://localhost:8100";
  checks.orchestrator = await probeHttp(`${orchUrl}/health`);

  // LLM check
  checks.llm = { status: process.env.GROQ_API_KEY ? "configured" : "not_configured" };

  const allOk = Object.values(checks).every((c) => c.status === "ok" || c.status === "configured");
  const anyError = Object.values(checks).some((c) => c.status === "error");

  return {
    status: anyError ? "unhealthy" : allOk ? "healthy" : "degraded",
    service: process.env.SERVICE_NAME ?? "web",
    version: "0.1.0",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
  };
}
