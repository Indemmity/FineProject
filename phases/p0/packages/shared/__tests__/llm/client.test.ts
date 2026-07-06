import { describe, it, expect, beforeEach } from "vitest";
import { cacheKey, getCached, setCache, invalidate, cacheSize } from "../../lib/llm/cache";

describe("LLM Cache", () => {
  beforeEach(() => invalidate());

  it("stores and retrieves cached responses", () => {
    setCache("test-key", "test-response", 60000);
    expect(getCached("test-key")).toBe("test-response");
  });

  it("returns null for missing keys", () => {
    expect(getCached("nonexistent")).toBeNull();
  });

  it("respects TTL", async () => {
    setCache("expire-key", "value", 1); // 1ms TTL
    await new Promise((r) => setTimeout(r, 10));
    expect(getCached("expire-key")).toBeNull();
  });

  it("hashes cache keys deterministically", () => {
    const k1 = cacheKey("hello world", "llama-3.3-70b");
    const k2 = cacheKey("hello world", "llama-3.3-70b");
    expect(k1).toBe(k2);
  });

  it("supports pattern invalidation", () => {
    setCache("resume:abc", "v1", 60000);
    setCache("resume:xyz", "v2", 60000);
    setCache("other", "v3", 60000);
    invalidate("resume");
    expect(cacheSize()).toBe(1);
    expect(getCached("other")).toBe("v3");
  });
});