/**
 * E2E: Concurrent pipeline test
 */

import { describe, it, expect } from "vitest";

const ORCHESTRATOR = "http://localhost:8100";

describe("Concurrent Pipelines", () => {
  it("Can create multiple pipelines in parallel", async () => {
    const pipelines = await Promise.all(
      Array.from({ length: 3 }, async () => {
        const res = await fetch(`${ORCHESTRATOR}/api/pipeline/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keywords: ["test"] }),
        });
        expect(res.status).toBe(201);
        return (await res.json()).pipelineId as string;
      })
    );
    expect(pipelines.length).toBe(3);
    expect(new Set(pipelines).size).toBe(3); // All unique IDs
  });
});
