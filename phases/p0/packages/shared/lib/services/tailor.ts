import { llm } from "../llm/client";
import { isMockMode } from "../llm/mock";
import { loadCachedPrompt, renderPrompt } from "../llm/prompts";
import { buildResumeMatchInsights } from "./resume-matching";

export interface TailorResult {
  sections: TailoredSection[];
}

export interface TailoredSection {
  section: string;
  original: string;
  tailored: string;
  reason: string;
}

export async function tailorResume(
  resumeText: string,
  jdText: string,
): Promise<TailorResult> {
  const sections = normalizeSections(extractBulletPoints(resumeText), resumeText);
  if (isMockMode()) {
    return buildHeuristicTailorResult(sections, resumeText, jdText);
  }

  const template = await loadCachedPrompt("resume", "tailor");
  const results: TailoredSection[] = [];
  const sharedSkills = collectSharedSkills(resumeText, jdText);

  for (const section of sections) {
    const prompt = renderPrompt(template, {
      original_bullet: section.content,
      jd_excerpt: jdText.slice(0, 2000),
      target_skills: extractKeywords(jdText).join(", "),
    });

    const response = await llm.complete(prompt);
    try {
      const parsed = JSON.parse(response.content);
      const tailored = typeof parsed.tailored === "string" && parsed.tailored.trim().length > 0
        ? parsed.tailored.trim()
        : section.content;
      results.push({
        section: section.heading,
        original: section.content,
        tailored,
        reason: typeof parsed.reason === "string" && parsed.reason.trim().length > 0
          ? parsed.reason.trim()
          : buildTailorReason(section.content, tailored, sharedSkills),
      });
    } catch {
      results.push(buildTailoredSection(section, sharedSkills));
    }
  }

  if (results.length === 0) {
    return buildHeuristicTailorResult(sections, resumeText, jdText);
  }

  return { sections: results };
}

interface BulletSection {
  heading: string;
  content: string;
}

function extractBulletPoints(text: string): BulletSection[] {
  const lines = text.split("\n");
  const sections: BulletSection[] = [];
  let currentSection = "general";
  const bullets: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (
      /^(experience|education|skills|projects?|summary)/i.test(trimmed)
    ) {
      if (bullets.length > 0) {
        sections.push({ heading: currentSection, content: bullets.join("\n") });
        bullets.length = 0;
      }
      currentSection = trimmed;
    } else {
      bullets.push(trimmed);
    }
  }
  if (bullets.length > 0) {
    sections.push({ heading: currentSection, content: bullets.join("\n") });
  }
  return sections;
}

function extractKeywords(text: string): string[] {
  const techWords =
    /(typescript|javascript|python|react|node|docker|kubernetes|aws|gcp|azure|sql|nosql|graphql|rest|api|git|ci|cd|agile|scrum)/gi;
  const matches = text.match(techWords);
  return [...new Set((matches ?? []).map((m) => m.toLowerCase()))];
}

function normalizeSections(
  sections: BulletSection[],
  resumeText: string,
): BulletSection[] {
  if (sections.length > 0) {
    return sections;
  }

  const fallback = resumeText.trim();
  if (!fallback) {
    return [{ heading: "general", content: "" }];
  }

  return [{ heading: "general", content: fallback }];
}

function buildHeuristicTailorResult(
  sections: BulletSection[],
  resumeText: string,
  jdText: string,
): TailorResult {
  const sharedSkills = collectSharedSkills(resumeText, jdText);

  return {
    sections: sections.map((section) => buildTailoredSection(section, sharedSkills)),
  };
}

function buildTailoredSection(
  section: BulletSection,
  sharedSkills: string[],
): TailoredSection {
  const tailored = section.content
    .split("\n")
    .map((line) => tailorLine(line))
    .join("\n");

  return {
    section: section.heading,
    original: section.content,
    tailored,
    reason: buildTailorReason(section.content, tailored, sharedSkills),
  };
}

function tailorLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) {
    return trimmed;
  }

  let tailored = trimmed;
  for (const [pattern, replacement] of VERB_REPLACEMENTS) {
    if (pattern.test(tailored)) {
      tailored = tailored.replace(pattern, replacement);
      break;
    }
  }

  return tailored.replace(/\s+/g, " ").trim();
}

function buildTailorReason(
  original: string,
  tailored: string,
  sharedSkills: string[],
): string {
  if (original === tailored) {
    if (sharedSkills.length > 0) {
      return `Kept the bullet factual because it already reflects ${joinList(sharedSkills.slice(0, 3))}.`;
    }

    return "Kept the bullet unchanged because it already reads clearly and truthfully.";
  }

  if (sharedSkills.length > 0) {
    return `Polished the wording while keeping ${joinList(sharedSkills.slice(0, 3))} in view.`;
  }

  return "Polished the wording without adding new claims.";
}

function collectSharedSkills(resumeText: string, jdText: string): string[] {
  const insights = buildResumeMatchInsights(resumeText, jdText);
  const resumeLower = normalizeForMatch(resumeText);
  const jdLower = normalizeForMatch(jdText);
  const shared = new Set<string>();

  for (const item of insights.analysis.skillBreakdown) {
    const skill = item.skill.trim();
    if (!skill) continue;
    const normalizedSkill = normalizeForMatch(skill);
    if (normalizedSkill && resumeLower.includes(normalizedSkill) && jdLower.includes(normalizedSkill)) {
      shared.add(skill);
    }
  }

  for (const keyword of extractKeywords(resumeText)) {
    if (extractKeywords(jdText).includes(keyword)) {
      shared.add(toTitleCase(keyword));
    }
  }

  return [...shared].slice(0, 4);
}

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function joinList(items: string[]): string {
  if (items.length <= 1) {
    return items[0] ?? "";
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function toTitleCase(value: string): string {
  const normalized = value.trim().toLowerCase();
  const acronymMap: Record<string, string> = {
    api: "API",
    apis: "APIs",
    aws: "AWS",
    gcp: "GCP",
    sql: "SQL",
    rest: "REST",
    git: "Git",
    graphql: "GraphQL",
    docker: "Docker",
    kubernetes: "Kubernetes",
    react: "React",
    node: "Node.js",
    nodejs: "Node.js",
    "node.js": "Node.js",
    nextjs: "Next.js",
    "next.js": "Next.js",
    typescript: "TypeScript",
    javascript: "JavaScript",
    "ci/cd": "CI/CD",
  };

  if (acronymMap[normalized]) {
    return acronymMap[normalized];
  }

  return value
    .split(/\s+/)
    .map((part) => {
      if (!part) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

const VERB_REPLACEMENTS: Array<[RegExp, string]> = [
  [/^worked on\b/i, "Contributed to"],
  [/^worked with\b/i, "Collaborated on"],
  [/^built\b/i, "Engineered and deployed"],
  [/^developed\b/i, "Developed and maintained"],
  [/^created\b/i, "Designed and implemented"],
  [/^helped\b/i, "Supported and optimized"],
  [/^managed\b/i, "Led and coordinated"],
  [/^implemented\b/i, "Implemented and optimized"],
  [/^designed\b/i, "Architected and delivered"],
  [/^led\b/i, "Spearheaded and coordinated"],
  [/^maintained\b/i, "Maintained and enhanced"],
  [/^improved\b/i, "Enhanced and optimized"],
  [/^wrote\b/i, "Developed and documented"],
  [/^made\b/i, "Created and delivered"],
  [/^did\b/i, "Executed and delivered"],
  [/^responsible for\b/i, "Led and delivered"],
  [/^assisted with\b/i, "Contributed to"],
  [/^participated in\b/i, "Collaborated on"],
  [/^involved in\b/i, "Contributed to"],
  [/^handled\b/i, "Managed and resolved"],
];
