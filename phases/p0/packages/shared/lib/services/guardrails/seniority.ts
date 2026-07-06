import type { GuardrailIssue } from "../guardrails"

const LEVEL_ORDER = ["entry", "junior", "mid", "senior", "lead", "principal", "director"];

const TITLE_SENIORITY: Record<string, number> = {
  junior: 0,
  "jr.": 0,
  "software engineer i": 0,
  "software engineer ii": 1,
  mid: 1,
  intermediate: 1,
  senior: 2,
  "sr.": 2,
  lead: 3,
  staff: 3,
  principal: 4,
  director: 5,
  "vp": 5,
  "vice president": 5,
  "head": 5,
  chief: 5,
};

export function checkSeniority(
  originalText: string,
  tailoredText: string,
): GuardrailIssue[] {
  const issues: GuardrailIssue[] = [];
  const origLines = originalText.split("\n");
  const tailLines = tailoredText.split("\n");

  const origMaxLevel = maxSeniorityLevel(origLines);
  const tailMaxLevel = maxSeniorityLevel(tailLines);

  if (tailMaxLevel > origMaxLevel && origMaxLevel >= 0) {
    issues.push({
      type: "error",
      field: "seniority",
      message: `Resume seniority increased from level ${origMaxLevel} to ${tailMaxLevel}. Original max: ${levelName(origMaxLevel)}, tailored max: ${levelName(tailMaxLevel)}`,
    });
  }

  // Check for years of experience inflation
  const origYears = extractYears(originalText);
  const tailYears = extractYears(tailoredText);
  if (tailYears > origYears && origYears > 0) {
    issues.push({
      type: "warning",
      field: "experience",
      message: `Years of experience increased from ${origYears} to ${tailYears}`,
    });
  }

  return issues;
}

function maxSeniorityLevel(lines: string[]): number {
  let max = -1;
  for (const line of lines) {
    const lower = line.toLowerCase();
    for (const [keyword, level] of Object.entries(TITLE_SENIORITY)) {
      if (lower.includes(keyword) && level > max) {
        max = level;
      }
    }
  }
  return max;
}

function levelName(level: number): string {
  return LEVEL_ORDER[level] ?? `level_${level}`;
}

function extractYears(text: string): number {
  const match = text.match(
    /(\d+)\s*\+?\s*years?\s+(of\s+)?experience/i,
  );
  return match ? parseInt(match[1]!, 10) : 0;
}