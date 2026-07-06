import { describe, it, expect } from "vitest";
import { computeDiff, countChanges } from "../../lib/services/diff";

describe("Diff Engine", () => {
  it("detects unchanged lines", () => {
    const text = "line1\nline2\nline3";
    const diffs = computeDiff(text, text);
    expect(diffs.every((d) => d.type === "unchanged")).toBe(true);
    expect(diffs.length).toBe(3);
  });

  it("detects modified lines", () => {
    const orig = "hello world";
    const tail = "hello there";
    const diffs = computeDiff(orig, tail);
    expect(diffs.some((d) => d.type === "modified")).toBe(true);
  });

  it("detects added lines", () => {
    const orig = "line1";
    const tail = "line1\nline2";
    const diffs = computeDiff(orig, tail);
    expect(diffs.some((d) => d.type === "added")).toBe(true);
  });

  it("detects removed lines", () => {
    const orig = "line1\nline2";
    const tail = "line1";
    const diffs = computeDiff(orig, tail);
    expect(diffs.some((d) => d.type === "removed")).toBe(true);
  });

  it("countChanges returns correct stats", () => {
    const orig = "a\nb\nc\nd";
    const tail = "a\nx\nc";
    const diffs = computeDiff(orig, tail);
    const stats = countChanges(diffs);
    expect(stats.modified).toBe(1); // b→x
    expect(stats.removed).toBe(1);  // d removed
    expect(stats.unchanged + stats.modified + stats.removed + stats.added).toBe(
      diffs.length,
    );
  });
});