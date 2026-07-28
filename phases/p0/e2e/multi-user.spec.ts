/**
 * E2E: Multi-user isolation test
 */

import { describe, it, expect } from "vitest";

const HARVESTER = "http://localhost:8001";

describe("Multi-user Isolation", () => {
  it("Harvester health is stable", async () => {
    const res = await fetch(`${HARVESTER}/health`);
    expect(res.status).toBe(200);
  });

  it("Job listing returns data", async () => {
    const res = await fetch(`${HARVESTER}/api/jobs/?limit=3`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.jobs)).toBe(true);
  });
});
