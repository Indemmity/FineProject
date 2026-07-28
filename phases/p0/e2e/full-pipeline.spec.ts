/**
 * E2E: Full pipeline test — tests the real running services via HTTP.
 */

import { describe, it, expect } from "vitest";

const HARVESTER = "http://localhost:8001";
const CLOSER = "http://localhost:8002";
const ORCHESTRATOR = "http://localhost:8100";

describe("Full Pipeline — Integration Tests", () => {
  it("Harvester is healthy", async () => {
    const res = await fetch(`${HARVESTER}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("healthy");
  });

  it("Closer is healthy", async () => {
    const res = await fetch(`${CLOSER}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("healthy");
  });

  it("Orchestrator is healthy", async () => {
    const res = await fetch(`${ORCHESTRATOR}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("healthy");
  });

  it("Harvester lists available sources", async () => {
    const res = await fetch(`${HARVESTER}/api/jobs/sources`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sources).toBeDefined();
  });

  it("Harvester lists jobs", async () => {
    const res = await fetch(`${HARVESTER}/api/jobs/?limit=5`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.jobs)).toBe(true);
  });

  it("Closer returns outreach stats", async () => {
    const res = await fetch(`${CLOSER}/api/outreach/stats?user_id=demo-user`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data.total).toBe("number");
  });

  it("Closer returns outreach logs", async () => {
    const res = await fetch(`${CLOSER}/api/outreach/logs?user_id=demo-user`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.logs)).toBe(true);
  });

  it("Orchestrator creates a pipeline", async () => {
    const res = await fetch(`${ORCHESTRATOR}/api/pipeline/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords: ["developer"] }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.pipelineId).toBeDefined();
  });

  it("Orchestrator lists pipelines", async () => {
    const res = await fetch(`${ORCHESTRATOR}/api/pipeline/`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.pipelines)).toBe(true);
  });
});
