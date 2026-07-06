/**
 * PII masking — masks personally identifiable information in text.
 *
 * Used before sending resume data to the LLM, and restored after processing.
 */

const PII_PATTERNS: [RegExp, string][] = [
  [/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "[REDACTED-PHONE]"],
  [/\b[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, "[REDACTED-EMAIL]"],
  [/\b\d{3}[-]?\d{2}[-]?\d{4}\b/g, "[REDACTED-SSN]"],
  [/\b(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|blvd|boulevard)\b/i, "[REDACTED-ADDRESS]"],
  [/\b\d{5}(-\d{4})?\b/g, "[REDACTED-ZIP]"],
];

export function maskPII(text: string): string {
  let masked = text;
  for (const [pattern, replacement] of PII_PATTERNS) {
    masked = masked.replace(pattern, replacement);
  }
  return masked;
}

export function restorePII(
  originalText: string,
  maskedText: string,
): string {
  let restored = maskedText;
  const piiMap = new Map<string, string>();

  // Extract PII from original
  for (const [pattern] of PII_PATTERNS) {
    const matches = originalText.match(pattern);
    if (matches) {
      for (const match of matches) {
        const key = maskPII(match);
        piiMap.set(key, match);
      }
    }
  }

  // Restore in masked text
  for (const [placeholder, original] of piiMap) {
    restored = restored.replaceAll(placeholder, original);
  }

  return restored;
}