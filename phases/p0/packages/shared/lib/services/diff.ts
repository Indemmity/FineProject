export interface DiffLine {
  type: "unchanged" | "added" | "removed" | "modified";
  originalLine: string;
  tailoredLine: string;
  lineNumber: number;
  reason?: string;
}

export function computeDiff(
  originalText: string,
  tailoredText: string,
): DiffLine[] {
  const origLines = originalText.split("\n");
  const tailLines = tailoredText.split("\n");
  const maxLen = Math.max(origLines.length, tailLines.length);
  const diffs: DiffLine[] = [];

  for (let i = 0; i < maxLen; i++) {
    const orig = origLines[i] ?? "";
    const tail = tailLines[i] ?? "";
    const lineNumber = i + 1;

    if (!orig && tail) {
      diffs.push({
        type: "added",
        originalLine: "",
        tailoredLine: tail,
        lineNumber,
      });
    } else if (orig && !tail) {
      diffs.push({
        type: "removed",
        originalLine: orig,
        tailoredLine: "",
        lineNumber,
      });
    } else if (orig !== tail) {
      diffs.push({
        type: "modified",
        originalLine: orig,
        tailoredLine: tail,
        lineNumber,
      });
    } else {
      diffs.push({
        type: "unchanged",
        originalLine: orig,
        tailoredLine: tail,
        lineNumber,
      });
    }
  }

  return diffs;
}

export function countChanges(diffs: DiffLine[]): {
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
} {
  return {
    added: diffs.filter((d) => d.type === "added").length,
    removed: diffs.filter((d) => d.type === "removed").length,
    modified: diffs.filter((d) => d.type === "modified").length,
    unchanged: diffs.filter((d) => d.type === "unchanged").length,
  };
}