import type { GuardrailIssue } from "../guardrails"

export function checkFabrication(
  originalText: string,
  tailoredText: string,
): GuardrailIssue[] {
  const issues: GuardrailIssue[] = [];
  const origLower = originalText.toLowerCase();
  const tailLines = tailoredText.split("\n");

  for (const line of tailLines) {
    const lower = line.toLowerCase();

    // Check for company names not in original
    const companyMatch = lower.match(/@\s*([a-z][a-z\s]+?)(?:\s+is|\s+was|\s+where|\s+at)/i);
    if (companyMatch) {
      const company = companyMatch[1]!.trim();
      if (company.length > 2 && !origLower.includes(company)) {
        issues.push({
          type: "error",
          field: "company",
          message: `Company "${company}" not found in original resume`,
        });
      }
    }

    // Check for certifications not in original
    const certMatch = lower.match(
      /(certified|certification|certificate)\s+(in\s+)?([a-z][a-z\s]+)/i,
    );
    if (certMatch) {
      const cert = certMatch[3]?.trim() ?? certMatch[0];
      if (!origLower.includes(cert.slice(0, 10))) {
        issues.push({
          type: "warning",
          field: "certification",
          message: `Certification "${cert}" may not be in original resume`,
        });
      }
    }

    // Check for degree inflation
    const degreeMatch = lower.match(
      /\b(ph\.?d|master|bachelor|mba|b\.?tech|m\.?tech)\b/i,
    );
    if (degreeMatch) {
      const degree = degreeMatch[0];
      if (!origLower.includes(degree.toLowerCase())) {
        issues.push({
          type: "error",
          field: "education",
          message: `Degree "${degree}" not found in original resume`,
        });
      }
    }
  }

  return issues;
}