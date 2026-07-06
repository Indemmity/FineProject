import { describe, it, expect } from "vitest";
import { checkTruthfulness } from "../../lib/services/guardrails/truthfulness";
import { checkFabrication } from "../../lib/services/guardrails/fabrication";
import { checkSeniority } from "../../lib/services/guardrails/seniority";

describe("Truthfulness Guard", () => {
  it("detects title inflation", () => {
    const original = "Worked as a Junior Developer";
    const tailored = "Senior Software Engineer with 5 years experience";
    const issues = checkTruthfulness(original, tailored);
    expect(issues.some((i) => i.field === "job_title")).toBe(true);
  });

  it("detects inflated metrics", () => {
    const original = "Worked on the product.";
    const tailored = "Increased revenue by 500%";
    const issues = checkTruthfulness(original, tailored);
    expect(issues.some((i) => i.field === "metrics")).toBe(true);
  });

  it("passes truthful content", () => {
    const text = "Worked as a Senior Developer on the platform team";
    const issues = checkTruthfulness(text, text);
    expect(issues.length).toBe(0);
  });
});

describe("Fabrication Guard", () => {
  it("detects fabricated company names", () => {
    const original = "Worked at RealCorp";
    const tailored = "Worked at @FakeCompany where I built things";
    const issues = checkFabrication(original, tailored);
    expect(issues.some((i) => i.field === "company")).toBe(true);
  });

  it("detects fabricated certifications", () => {
    const original = "BSc Computer Science";
    const tailored = "Certified in AWS Solutions Architect and PhD in AI";
    const issues = checkFabrication(original, tailored);
    expect(issues.some((i) => i.field === "education")).toBe(true);
  });
});

describe("Seniority Guard", () => {
  it("detects seniority inflation", () => {
    const original = "Junior Software Engineer";
    const tailored = "Senior Software Engineer looking for new challenges";
    const issues = checkSeniority(original, tailored);
    expect(issues.some((i) => i.field === "seniority")).toBe(true);
  });

  it("detects experience inflation", () => {
    const original = "3+ years of experience";
    const tailored = "10+ years of experience in full-stack development";
    const issues = checkSeniority(original, tailored);
    expect(issues.some((i) => i.field === "experience")).toBe(true);
  });

  it("passes consistent seniority", () => {
    const text = "Senior Software Engineer with 8 years experience";
    const issues = checkSeniority(text, text);
    expect(issues.length).toBe(0);
  });
});