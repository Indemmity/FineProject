import { loadCachedPrompt, renderPrompt } from "../llm/prompts";
import { llm } from "../llm/client";
import { isMockMode } from "../llm/mock";
import { checkTruthfulness } from "./guardrails/truthfulness";
import { checkFabrication } from "./guardrails/fabrication";
import { checkSeniority } from "./guardrails/seniority";

export interface GuardrailIssue {
  type: "error" | "warning";
  field: string;
  message: string;
}

export interface GuardrailResult {
  passed: boolean;
  issues: GuardrailIssue[];
  severity: "low" | "medium" | "high";
}

export async function checkGuardrails(
  originalText: string,
  tailoredText: string,
): Promise<GuardrailResult> {
  if (isMockMode()) {
    return buildDeterministicGuardrails(originalText, tailoredText);
  }

  const template = await loadCachedPrompt("guardrails", "truthfulness");
  const prompt = renderPrompt(template, {
    original_text: originalText.slice(0, 4000),
    tailored_text: tailoredText.slice(0, 4000),
  });

  const response = await llm.complete(prompt);

  try {
    const parsed = JSON.parse(response.content);
    return {
      passed: parsed.passed ?? false,
      issues: parsed.issues ?? [],
      severity: parsed.severity ?? "low",
    };
  } catch {
    return buildDeterministicGuardrails(originalText, tailoredText);
  }
}

function buildDeterministicGuardrails(
  originalText: string,
  tailoredText: string,
): GuardrailResult {
  const issues = [
    ...checkTruthfulness(originalText, tailoredText),
    ...checkFabrication(originalText, tailoredText),
    ...checkSeniority(originalText, tailoredText),
  ];

  return {
    passed: issues.length === 0,
    issues,
    severity: determineSeverity(issues),
  };
}

function determineSeverity(issues: GuardrailIssue[]): GuardrailResult["severity"] {
  if (issues.length === 0) {
    return "low";
  }

  if (issues.some((issue) => issue.field === "job_title" || issue.field === "seniority" || issue.field === "education")) {
    return "high";
  }

  if (issues.some((issue) => issue.type === "error")) {
    return issues.length > 2 ? "high" : "medium";
  }

  return "low";
}
