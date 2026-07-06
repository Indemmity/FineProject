import type { GuardrailIssue } from "../guardrails";

export function checkTruthfulness(
  originalText: string,
  tailoredText: string,
): GuardrailIssue[] {
  const issues: GuardrailIssue[] = [];
  const origLines = originalText.toLowerCase().split("\n");
  const tailLines = tailoredText.split("\n");

  for (const tailLine of tailLines) {
    const lower = tailLine.toLowerCase();

    // Check for inflated job titles
    const titleMatch = lower.match(
      /(senior|lead|principal|head|director|chief|vp)\s+(software|engineer|developer)/,
    );
    if (titleMatch) {
      const hasOriginal = origLines.some((l) =>
        l.includes(titleMatch[0]),
      );
      if (!hasOriginal) {
        issues.push({
          type: "error",
          field: "job_title",
          message: `Potential title inflation: "${titleMatch[0]}" not found in original`,
        });
      }
    }

    // Check for fabricated metrics — allow words between verb and "by"
    const metricMatch = lower.match(
      /(increased|improved|reduced|grew|boosted)\s+[\w\s]+\s+by\s+(\d+)/,
    );
    if (metricMatch) {
      const value = parseInt(metricMatch[2]!, 10);
      if (value > 200) {
        const hasOriginal = origLines.some((l) =>
          l.includes(metricMatch[1]!),
        );
        if (!hasOriginal) {
          issues.push({
            type: "error",
            field: "metrics",
            message: `Potentially inflated metric: "${metricMatch[0]}" exceeds 200%`,
          });
        }
      }
    }
  }

  return issues;
}