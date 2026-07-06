import { generatePDF } from "./generator";
import type { MatchResult } from "../services/analyzer";
import type { GuardrailResult } from "../services/guardrails";

export interface ComparisonData {
  originalText: string;
  tailoredText: string;
  score: MatchResult;
  guardrails: GuardrailResult;
}

export async function generateComparisonPDF(
  data: ComparisonData,
): Promise<Buffer> {
  const html = `
<h1>Resume Comparison Report</h1>
<p>Match Score: <strong>${data.score.score}/100</strong></p>

<h2>Score Breakdown</h2>
<ul>
  ${data.score.skillBreakdown
    .map(
      (s) => `<li><strong>${s.skill}</strong>: ${s.level} (relevance: ${s.relevance}%)</li>`,
    )
    .join("")}
</ul>

<h2>Strengths</h2>
<ul>${data.score.strengths.map((s) => `<li>${s}</li>`).join("")}</ul>

<h2>Weaknesses</h2>
<ul>${data.score.weaknesses.map((w) => `<li>${w}</li>`).join("")}</ul>

<h2>Guardrail Results</h2>
<p>Status: <strong>${data.guardrails.passed ? "PASSED" : "FAILED"}</strong> (severity: ${data.guardrails.severity})</p>
<ul>
  ${data.guardrails.issues
    .map(
      (i) => `<li>[${i.type.toUpperCase()}] ${i.field}: ${i.message}</li>`,
    )
    .join("")}
</ul>

<h2>Original vs Tailored</h2>
<pre style="font-size:9pt; background:#f5f5f5; padding:8px;">
<strong>--- Original ---</strong>
${data.tailoredText.slice(0, 2000)}
<strong>--- Tailored ---</strong>
${data.originalText.slice(0, 2000)}
</pre>`;

  return generatePDF(html, { title: "Resume Comparison", fontSize: 10 });
}