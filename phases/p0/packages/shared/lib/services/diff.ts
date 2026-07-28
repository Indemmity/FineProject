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
  const origSections = originalText.split("\n\n");
  const tailSections = tailoredText.split("\n\n");

  if (origSections.length !== tailSections.length || origSections.length <= 1) {
    return lineByLineDiff(originalText, tailoredText);
  }

  const diffs: DiffLine[] = [];

  for (let s = 0; s < origSections.length; s++) {
    const origBullets = origSections[s].split("\n").filter((l) => l.trim());
    const tailBullets = tailSections[s].split("\n").filter((l) => l.trim());

    let lineNum = s * 100 + 1;

    if (origBullets.length === 0 && tailBullets.length === 0) continue;
    if (origBullets.length === 0) {
      for (const b of tailBullets) {
        diffs.push({ type: "added", originalLine: "", tailoredLine: b, lineNumber: lineNum++, reason: "New bullet added" });
      }
      continue;
    }
    if (tailBullets.length === 0) {
      for (const b of origBullets) {
        diffs.push({ type: "removed", originalLine: b, tailoredLine: "", lineNumber: lineNum++, reason: "Bullet removed" });
      }
      continue;
    }

    const maxBullets = Math.max(origBullets.length, tailBullets.length);
    for (let b = 0; b < maxBullets; b++) {
      const origBullet = origBullets[b] || "";
      const tailBullet = tailBullets[b] || "";

      if (!origBullet && tailBullet) {
        diffs.push({ type: "added", originalLine: "", tailoredLine: tailBullet, lineNumber: lineNum++, reason: "Bullet added to match JD" });
      } else if (origBullet && !tailBullet) {
        diffs.push({ type: "removed", originalLine: origBullet, tailoredLine: "", lineNumber: lineNum++, reason: "Bullet removed" });
      } else if (origBullet !== tailBullet) {
        diffs.push({
          type: "modified",
          originalLine: origBullet,
          tailoredLine: tailBullet,
          lineNumber: lineNum++,
          reason: guessReason(origBullet, tailBullet),
        });
      } else {
        diffs.push({ type: "unchanged", originalLine: origBullet, tailoredLine: tailBullet, lineNumber: lineNum++ });
      }
    }
  }

  return diffs;
}

function guessReason(original: string, tailored: string): string {
  const origWords = new Set(original.toLowerCase().split(/\s+/));
  const tailWords = new Set(tailored.toLowerCase().split(/\s+/));

  const added = [...tailWords].filter((w) => !origWords.has(w));
  if (added.length > 0) {
    const meaningful = added.filter((w) => w.length > 3).slice(0, 2);
    return meaningful.length > 0
      ? `Incorporated: ${meaningful.join(", ")}`
      : "Refined bullet wording";
  }

  const removed = [...origWords].filter((w) => !tailWords.has(w));
  if (removed.length > 0) {
    return "Tightened bullet wording";
  }

  return "Paraphrased for impact";
}

function lineByLineDiff(originalText: string, tailoredText: string): DiffLine[] {
  const origLines = originalText.split("\n");
  const tailLines = tailoredText.split("\n");
  const maxLen = Math.max(origLines.length, tailLines.length);
  const diffs: DiffLine[] = [];

  for (let i = 0; i < maxLen; i++) {
    const orig = origLines[i] ?? "";
    const tail = tailLines[i] ?? "";
    const lineNumber = i + 1;

    if (!orig && tail) {
      diffs.push({ type: "added", originalLine: "", tailoredLine: tail, lineNumber });
    } else if (orig && !tail) {
      diffs.push({ type: "removed", originalLine: orig, tailoredLine: "", lineNumber });
    } else if (orig !== tail) {
      diffs.push({ type: "modified", originalLine: orig, tailoredLine: tail, lineNumber });
    } else {
      diffs.push({ type: "unchanged", originalLine: orig, tailoredLine: tail, lineNumber });
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
