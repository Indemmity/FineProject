import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { analyzeResume } from "../../lib/services/analyzer";
import { analyzeGaps } from "../../lib/services/gap-analyzer";

const originalMockMode = process.env.MOCK_MODE;
const originalGroqKey = process.env.GROQ_API_KEY;

beforeAll(() => {
  process.env.MOCK_MODE = "true";
  process.env.GROQ_API_KEY = "";
});

afterAll(() => {
  if (originalMockMode === undefined) {
    delete process.env.MOCK_MODE;
  } else {
    process.env.MOCK_MODE = originalMockMode;
  }

  if (originalGroqKey === undefined) {
    delete process.env.GROQ_API_KEY;
  } else {
    process.env.GROQ_API_KEY = originalGroqKey;
  }
});

describe("Resume analysis fallback", () => {
  it("scores a better-matching resume higher than an unrelated one", async () => {
    const jdText =
      "Looking for a React, TypeScript, AWS engineer with Kubernetes, SQL, and REST API experience. " +
      "Strong communication and leadership skills are a plus.";

    const strongResume =
      "Built React and TypeScript dashboards, shipped REST APIs on AWS, used PostgreSQL and Docker, " +
      "and led cross-functional delivery with measurable product improvements.";

    const weakResume =
      "Created marketing copy and email campaigns for a small business, focusing on brand voice and engagement.";

    const strong = await analyzeResume(strongResume, jdText);
    const weak = await analyzeResume(weakResume, jdText);

    expect(strong.score).toBeGreaterThan(weak.score);
    expect(strong.strengths.join(" ")).toMatch(/React|TypeScript|AWS/);
    expect(strong.weaknesses.join(" ")).toMatch(/quantified|measurable|impact/i);
  });

  it("returns JD-specific gaps instead of a canned list", async () => {
    const jdText =
      "We need React, TypeScript, AWS, Kubernetes, and GraphQL experience. " +
      "Communication and leadership matter too.";
    const resumeText =
      "Built React and TypeScript apps on AWS with PostgreSQL, Docker, and strong ownership.";

    const gaps = await analyzeGaps(resumeText, jdText);

    expect(gaps.some((gap) => gap.skill === "Kubernetes")).toBe(true);
    expect(gaps.some((gap) => gap.skill === "GraphQL")).toBe(true);
    expect(gaps.some((gap) => gap.skill === "React")).toBe(false);
  });
});
