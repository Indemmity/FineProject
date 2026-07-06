import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { tailorResume } from "../../lib/services/tailor";
import { checkGuardrails } from "../../lib/services/guardrails";

const previousEnv = {
  MOCK_MODE: process.env.MOCK_MODE,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
};

beforeAll(() => {
  process.env.MOCK_MODE = "true";
  process.env.GROQ_API_KEY = "";
});

afterAll(() => {
  if (previousEnv.MOCK_MODE === undefined) {
    delete process.env.MOCK_MODE;
  } else {
    process.env.MOCK_MODE = previousEnv.MOCK_MODE;
  }

  if (previousEnv.GROQ_API_KEY === undefined) {
    delete process.env.GROQ_API_KEY;
  } else {
    process.env.GROQ_API_KEY = previousEnv.GROQ_API_KEY;
  }
});

describe("tailorResume", () => {
  it("rewrites bullets in mock mode instead of returning canned text", async () => {
    const result = await tailorResume(
      "Experience\nBuilt web applications with React\nWorked on APIs",
      "Looking for React engineers who build APIs",
    );

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0]?.original).toContain("Built web applications with React");
    expect(result.sections[0]?.tailored).not.toBe(result.sections[0]?.original);
    expect(result.sections[0]?.tailored).toContain("Built and maintained");
  });
});

describe("checkGuardrails", () => {
  it("uses deterministic guardrail checks in mock mode", async () => {
    const result = await checkGuardrails(
      "Worked as a Junior Developer",
      "Senior Software Engineer with 10 years experience",
    );

    expect(result.passed).toBe(false);
    expect(result.issues.some((issue) => issue.field === "seniority")).toBe(true);
  });
});
