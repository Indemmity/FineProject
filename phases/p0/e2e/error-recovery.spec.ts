/**
 * E2E: Error recovery test
 */

import { describe, it, expect } from "vitest";

const ORCHESTRATOR = "http://localhost:8100";

describe("Error Recovery", () => {
  it("Pipeline handles missing pipeline ID gracefully", async () => {
    const res = await fetch(`${ORCHESTRATOR}/api/pipeline/nonexistent-id`);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("Transition requires valid state", async () => {
    const res = await fetch(`${ORCHESTRATOR}/api/pipeline/nonexistent-id/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(422);
  });
});
