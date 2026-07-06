type SkillCategory = "technical" | "domain" | "soft_skill" | "education";
type SkillImportance = "high" | "medium" | "low";
type SkillLevel = "beginner" | "intermediate" | "advanced" | "expert";

export interface ResumeSkillBreakdown {
  skill: string;
  level: SkillLevel;
  relevance: number;
}

export interface ResumeGapItem {
  skill: string;
  importance: SkillImportance;
  category: SkillCategory;
  suggestedAction: string;
}

export interface ResumeAnalysisResult {
  score: number;
  skillBreakdown: ResumeSkillBreakdown[];
  strengths: string[];
  weaknesses: string[];
}

export interface ResumeMatchInsights {
  analysis: ResumeAnalysisResult;
  gaps: ResumeGapItem[];
}

interface SkillDefinition {
  skill: string;
  aliases: string[];
  category: SkillCategory;
  importance: SkillImportance;
  weight: number;
}

interface SkillSignal extends SkillDefinition {
  resumeCount: number;
  jdCount: number;
  relevance: number;
  level: SkillLevel;
  matched: boolean;
}

const SKILL_DEFINITIONS: SkillDefinition[] = [
  { skill: "TypeScript", aliases: ["typescript"], category: "technical", importance: "high", weight: 2.4 },
  { skill: "JavaScript", aliases: ["javascript"], category: "technical", importance: "high", weight: 2.2 },
  { skill: "React", aliases: ["react"], category: "technical", importance: "high", weight: 2.6 },
  { skill: "Next.js", aliases: ["next.js", "nextjs"], category: "technical", importance: "high", weight: 2.4 },
  { skill: "Node.js", aliases: ["node.js", "nodejs"], category: "technical", importance: "high", weight: 2.2 },
  { skill: "Python", aliases: ["python"], category: "technical", importance: "high", weight: 2.2 },
  { skill: "Java", aliases: ["java"], category: "technical", importance: "medium", weight: 1.8 },
  { skill: "SQL", aliases: ["sql"], category: "technical", importance: "high", weight: 2.1 },
  { skill: "PostgreSQL", aliases: ["postgresql", "postgres"], category: "technical", importance: "high", weight: 2.2 },
  { skill: "MongoDB", aliases: ["mongodb", "mongo db"], category: "technical", importance: "medium", weight: 1.7 },
  { skill: "REST APIs", aliases: ["rest api", "rest apis", "restful api", "restful apis"], category: "technical", importance: "high", weight: 2.2 },
  { skill: "GraphQL", aliases: ["graphql"], category: "technical", importance: "medium", weight: 1.9 },
  { skill: "Docker", aliases: ["docker"], category: "technical", importance: "medium", weight: 1.9 },
  { skill: "Kubernetes", aliases: ["kubernetes"], category: "technical", importance: "high", weight: 2.3 },
  { skill: "AWS", aliases: ["aws", "amazon web services"], category: "technical", importance: "high", weight: 2.4 },
  { skill: "Azure", aliases: ["azure"], category: "technical", importance: "medium", weight: 1.8 },
  { skill: "GCP", aliases: ["gcp", "google cloud"], category: "technical", importance: "medium", weight: 1.8 },
  { skill: "Git", aliases: ["git"], category: "technical", importance: "medium", weight: 1.4 },
  { skill: "CI/CD", aliases: ["ci/cd", "cicd", "continuous integration", "continuous delivery"], category: "technical", importance: "medium", weight: 1.9 },
  { skill: "Testing", aliases: ["testing", "test automation"], category: "technical", importance: "medium", weight: 1.6 },
  { skill: "Jest", aliases: ["jest"], category: "technical", importance: "low", weight: 1.3 },
  { skill: "Vitest", aliases: ["vitest"], category: "technical", importance: "low", weight: 1.3 },
  { skill: "Terraform", aliases: ["terraform"], category: "technical", importance: "medium", weight: 1.8 },
  { skill: "Redis", aliases: ["redis"], category: "technical", importance: "medium", weight: 1.6 },
  { skill: "Microservices", aliases: ["microservices"], category: "technical", importance: "medium", weight: 1.8 },
  { skill: "System Design", aliases: ["system design"], category: "technical", importance: "medium", weight: 1.9 },
  { skill: "Linux", aliases: ["linux"], category: "technical", importance: "low", weight: 1.2 },
  { skill: "Machine Learning", aliases: ["machine learning", "ml"], category: "technical", importance: "medium", weight: 1.8 },
  { skill: "Data Analysis", aliases: ["data analysis", "analytics"], category: "domain", importance: "medium", weight: 1.5 },
  { skill: "Leadership", aliases: ["leadership", "led", "leading"], category: "soft_skill", importance: "high", weight: 2.0 },
  { skill: "Communication", aliases: ["communication", "communicate"], category: "soft_skill", importance: "medium", weight: 1.6 },
  { skill: "Collaboration", aliases: ["collaboration", "collaborate"], category: "soft_skill", importance: "medium", weight: 1.4 },
  { skill: "Problem Solving", aliases: ["problem solving", "problem-solving"], category: "soft_skill", importance: "medium", weight: 1.6 },
  { skill: "Agile", aliases: ["agile"], category: "soft_skill", importance: "low", weight: 1.1 },
  { skill: "Scrum", aliases: ["scrum"], category: "soft_skill", importance: "low", weight: 1.1 },
  { skill: "Bachelor's Degree", aliases: ["bachelor", "bachelor's", "bs ", "b.sc", "bsc"], category: "education", importance: "medium", weight: 1.4 },
  { skill: "Master's Degree", aliases: ["master", "master's", "ms ", "m.sc", "msc"], category: "education", importance: "medium", weight: 1.3 },
  { skill: "Certification", aliases: ["certification", "certified"], category: "education", importance: "medium", weight: 1.2 },
  { skill: "Product", aliases: ["product", "product management"], category: "domain", importance: "medium", weight: 1.3 },
  { skill: "SaaS", aliases: ["saas"], category: "domain", importance: "low", weight: 1.0 },
  { skill: "E-commerce", aliases: ["e-commerce", "ecommerce"], category: "domain", importance: "low", weight: 1.0 },
];

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "your",
  "you",
  "are",
  "was",
  "were",
  "have",
  "has",
  "had",
  "will",
  "would",
  "could",
  "should",
  "into",
  "over",
  "under",
  "about",
  "onto",
  "than",
  "then",
  "them",
  "they",
  "their",
  "there",
  "these",
  "those",
  "jobs",
  "job",
  "role",
  "roles",
  "position",
  "positions",
  "experience",
  "experienced",
  "working",
  "worked",
  "work",
  "build",
  "built",
  "design",
  "designed",
  "develop",
  "developed",
  "using",
  "use",
  "used",
  "team",
  "teams",
  "project",
  "projects",
  "company",
  "companies",
  "candidate",
  "candidates",
  "looking",
  "seeking",
  "need",
  "needs",
  "required",
  "require",
  "responsible",
  "responsibilities",
  "summary",
  "skill",
  "skills",
  "resume",
]);

const IMPACT_LANGUAGE = /\b(led|lead|owned|architected|designed|built|shipped|implemented|optimized|improved|reduced|increased|deployed|launched|scaled|delivered|created|managed|mentored|collaborated)\b/i;
const METRIC_LANGUAGE = /(\b\d+(?:\.\d+)?%|\b\d+\+|\b\d+(?:\.\d+)?\s+(?:users|customers|clients|projects|teams|years|requests|transactions|bugs|releases)\b)/i;

export function buildResumeMatchInsights(
  resumeText: string,
  jdText: string,
): ResumeMatchInsights {
  const resumeLower = resumeText.toLowerCase();
  const jdLower = jdText.toLowerCase();

  const termStats = buildTermStats(resumeText, jdText);
  const skillSignals = SKILL_DEFINITIONS
    .map((definition) => buildSkillSignal(definition, resumeLower, jdLower))
    .filter((signal): signal is SkillSignal => signal !== null);

  const matchedSignals = skillSignals
    .filter((signal) => signal.matched)
    .sort((a, b) => b.relevance - a.relevance || b.resumeCount - a.resumeCount);
  const missingSignals = skillSignals
    .filter((signal) => signal.jdCount > 0 && signal.resumeCount === 0)
    .sort((a, b) => b.relevance - a.relevance || b.jdCount - a.jdCount);

  const explicitCoverage = computeExplicitCoverage(skillSignals);
  const genericCoverage = computeGenericCoverage(termStats);
  const score = clampScore(
    Math.round((explicitCoverage * 70) + (genericCoverage * 30)),
  );

  const strengths = buildStrengths({
    matchedSignals,
    termStats,
    genericCoverage,
    resumeText,
  });

  const weaknesses = buildWeaknesses({
    missingSignals,
    explicitCoverage,
    genericCoverage,
    resumeText,
    jdText,
  });

  return {
    analysis: {
      score,
      skillBreakdown: buildSkillBreakdown(skillSignals, termStats),
      strengths,
      weaknesses,
    },
    gaps: buildGapItems(missingSignals, termStats),
  };
}

function buildSkillBreakdown(
  skillSignals: SkillSignal[],
  termStats: TermStats,
): ResumeSkillBreakdown[] {
  const breakdown = skillSignals
    .filter((signal) => signal.jdCount > 0 || signal.resumeCount > 0)
    .slice(0, 6)
    .map((signal) => ({
      skill: signal.skill,
      level: signal.level,
      relevance: signal.relevance,
    }));

  if (breakdown.length > 0) {
    return breakdown;
  }

  return termStats.sharedTerms.slice(0, 6).map((term) => ({
    skill: toTitleCase(term.term),
    level: term.sharedCount >= 3 ? "advanced" : term.sharedCount >= 2 ? "intermediate" : "beginner",
    relevance: clampScore(35 + (term.sharedCount * 10) + (term.jdCount * 5)),
  }));
}

function buildStrengths({
  matchedSignals,
  termStats,
  genericCoverage,
  resumeText,
}: {
  matchedSignals: SkillSignal[];
  termStats: TermStats;
  genericCoverage: number;
  resumeText: string;
}): string[] {
  const strengths: string[] = [];
  const matchedSkills = matchedSignals.slice(0, 4).map((signal) => signal.skill);

  if (matchedSkills.length > 0) {
    strengths.push(`Matches key requirements: ${joinList(matchedSkills)}`);
  }

  if (hasImpactLanguage(resumeText)) {
    strengths.push("Resume shows ownership and action-oriented language.");
  }

  if (hasMetrics(resumeText)) {
    strengths.push("Resume includes quantified impact.");
  }

  if (genericCoverage >= 0.5) {
    const sharedThemes = termStats.sharedTerms.slice(0, 3).map((term) => toTitleCase(term.term));
    if (sharedThemes.length > 0) {
      strengths.push(`Shared themes with the JD: ${joinList(sharedThemes)}`);
    }
  }

  if (strengths.length === 0) {
    strengths.push("Resume has some overlap with the target role.");
  }

  return dedupeAndLimit(strengths, 3);
}

function buildWeaknesses({
  missingSignals,
  explicitCoverage,
  genericCoverage,
  resumeText,
  jdText,
}: {
  missingSignals: SkillSignal[];
  explicitCoverage: number;
  genericCoverage: number;
  resumeText: string;
  jdText: string;
}): string[] {
  const weaknesses: string[] = [];
  const missingSkills = missingSignals.slice(0, 4).map((signal) => signal.skill);

  if (missingSkills.length > 0) {
    weaknesses.push(`Missing or underrepresented: ${joinList(missingSkills)}`);
  }

  if (!hasMetrics(resumeText)) {
    weaknesses.push("Add measurable outcomes to make the impact clearer.");
  }

  if (explicitCoverage < 0.5) {
    weaknesses.push("Core role requirements are only partially covered.");
  }

  if (genericCoverage < 0.35) {
    weaknesses.push("The resume and JD use different language; tighten the alignment.");
  }

  if (!hasImpactLanguage(resumeText) && hasImpactLanguage(jdText)) {
    weaknesses.push("The resume could use stronger action verbs to mirror the job description.");
  }

  if (weaknesses.length === 0) {
    weaknesses.push("No major gaps detected from the available text.");
  }

  return dedupeAndLimit(weaknesses, 3);
}

function buildGapItems(
  missingSignals: SkillSignal[],
  termStats: TermStats,
): ResumeGapItem[] {
  const explicitGaps = missingSignals.slice(0, 5).map((signal) => ({
    skill: signal.skill,
    importance: signal.importance,
    category: signal.category,
    suggestedAction: buildSuggestedAction(signal.skill, signal.category),
  }));

  if (explicitGaps.length > 0) {
    return explicitGaps;
  }

  return termStats.jdOnlyTerms.slice(0, 3).map((term) => ({
    skill: toTitleCase(term.term),
    importance: term.jdCount >= 2 ? "medium" : "low",
    category: classifyGenericTerm(term.term),
    suggestedAction: buildSuggestedAction(toTitleCase(term.term), classifyGenericTerm(term.term)),
  }));
}

function buildSkillSignal(
  definition: SkillDefinition,
  resumeLower: string,
  jdLower: string,
): SkillSignal | null {
  let resumeCount = 0;
  let jdCount = 0;

  for (const alias of definition.aliases) {
    resumeCount = Math.max(resumeCount, countMatches(resumeLower, alias));
    jdCount = Math.max(jdCount, countMatches(jdLower, alias));
  }

  if (resumeCount === 0 && jdCount === 0) {
    return null;
  }

  const matched = resumeCount > 0 && jdCount > 0;
  const relevance = clampScore(
    (definition.importance === "high" ? 55 : definition.importance === "medium" ? 45 : 35)
      + (matched ? 30 : 0)
      + (Math.min(resumeCount, 3) * 5)
      + (Math.min(jdCount, 3) * 4),
  );

  return {
    ...definition,
    resumeCount,
    jdCount,
    matched,
    relevance,
    level: deriveSkillLevel(resumeCount, jdCount, matched),
  };
}

function deriveSkillLevel(
  resumeCount: number,
  jdCount: number,
  matched: boolean,
): SkillLevel {
  if (!matched) {
    return "beginner";
  }

  if (resumeCount >= 3) {
    return hasImpactLanguageFromCount(resumeCount) ? "expert" : "advanced";
  }

  if (resumeCount >= 2 || jdCount >= 2) {
    return "advanced";
  }

  return "intermediate";
}

function buildTermStats(resumeText: string, jdText: string): TermStats {
  const resumeTerms = countTerms(resumeText);
  const jdTerms = countTerms(jdText);
  const sharedTerms: TermStat[] = [];
  const jdOnlyTerms: TermStat[] = [];

  for (const [term, jdCount] of jdTerms.entries()) {
    const resumeCount = resumeTerms.get(term) ?? 0;
    const stat: TermStat = {
      term,
      resumeCount,
      jdCount,
      sharedCount: Math.min(resumeCount, jdCount),
    };

    if (resumeCount > 0) {
      sharedTerms.push(stat);
    } else {
      jdOnlyTerms.push(stat);
    }
  }

  sharedTerms.sort((a, b) => b.sharedCount - a.sharedCount || b.jdCount - a.jdCount || a.term.localeCompare(b.term));
  jdOnlyTerms.sort((a, b) => b.jdCount - a.jdCount || a.term.localeCompare(b.term));

  return { sharedTerms, jdOnlyTerms, resumeTerms, jdTerms };
}

function computeExplicitCoverage(skillSignals: SkillSignal[]): number {
  let matchedWeight = 0;
  let totalWeight = 0;

  for (const signal of skillSignals) {
    if (signal.jdCount === 0) {
      continue;
    }
    totalWeight += signal.weight;
    if (signal.matched) {
      matchedWeight += signal.weight;
    }
  }

  if (totalWeight === 0) {
    return 0;
  }

  return matchedWeight / totalWeight;
}

function computeGenericCoverage(termStats: TermStats): number {
  let matched = 0;
  let total = 0;

  for (const [, jdCount] of termStats.jdTerms.entries()) {
    total += jdCount;
  }

  for (const [term, jdCount] of termStats.jdTerms.entries()) {
    const resumeCount = termStats.resumeTerms.get(term) ?? 0;
    matched += Math.min(resumeCount, jdCount);
  }

  if (total === 0) {
    return 0;
  }

  return matched / total;
}

function countTerms(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  const tokens = text
    .toLowerCase()
    .match(/[a-z0-9][a-z0-9+./-]{2,}/g) ?? [];

  for (const rawToken of tokens) {
    const token = normalizeTerm(rawToken);
    if (!token || STOP_WORDS.has(token)) {
      continue;
    }

    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return counts;
}

function normalizeTerm(term: string): string {
  return term
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function countMatches(text: string, phrase: string): number {
  const escaped = escapeRegExp(phrase.toLowerCase());
  const pattern = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, "gi");
  return Array.from(text.matchAll(pattern)).length;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasImpactLanguage(text: string): boolean {
  return IMPACT_LANGUAGE.test(text);
}

function hasMetrics(text: string): boolean {
  return METRIC_LANGUAGE.test(text);
}

function hasImpactLanguageFromCount(count: number): boolean {
  return count >= 2;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
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

function joinList(items: string[]): string {
  if (items.length <= 1) {
    return items[0] ?? "";
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function dedupeAndLimit(items: string[], limit: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const normalized = item.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
    if (result.length >= limit) {
      break;
    }
  }

  return result;
}

function buildSuggestedAction(skill: string, category: SkillCategory): string {
  switch (category) {
    case "technical":
      return `Add a concrete example showing hands-on work with ${skill}.`;
    case "soft_skill":
      return `Show a bullet that demonstrates ${skill} in a team setting.`;
    case "education":
      return `Reference the relevant ${skill} credential or training if you have it.`;
    case "domain":
    default:
      return `Add experience that connects your work to ${skill}.`;
  }
}

function classifyGenericTerm(term: string): SkillCategory {
  if (/\b(cert|degree|bachelor|master|phd|education)\b/i.test(term)) {
    return "education";
  }

  if (
    /\b(leadership|communication|collaboration|problem|team|mentoring|stakeholder)\b/i.test(term)
  ) {
    return "soft_skill";
  }

  if (
    /\b(api|cloud|data|database|frontend|backend|deployment|security|testing|architecture|platform|system)\b/i.test(term)
  ) {
    return "technical";
  }

  return "domain";
}

interface TermStat {
  term: string;
  resumeCount: number;
  jdCount: number;
  sharedCount: number;
}

interface TermStats {
  sharedTerms: TermStat[];
  jdOnlyTerms: TermStat[];
  resumeTerms: Map<string, number>;
  jdTerms: Map<string, number>;
}
