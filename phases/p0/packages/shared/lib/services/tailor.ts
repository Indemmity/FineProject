import { isMockMode } from "../llm/mock";
import { loadCachedPrompt, renderPrompt } from "../llm/prompts";
import { llm } from "../llm/client";

export interface TailorResult {
  sections: TailoredSection[];
  stats: TailorStats;
}

export interface TailoredSection {
  section: string;
  original: string;
  tailored: string;
  reason: string;
}

export interface TailorStats {
  bulletPointsRewritten: number;
  keywordsAdded: number;
  buzzwordsRemoved: number;
  bulletPointsTotal: number;
}

const BUZZWORDS = new Set([
  "hardworking", "team player", "go-getter", "self-starter", "ninja", "guru",
  "rockstar", "wizard", "hustler", "think outside the box", "synergy",
  "detail-oriented", "proven track record", "results-driven", "dynamic",
]);

const ACTION_VERBS: Record<string, string[]> = {
  built: ["Architected", "Engineered", "Developed"],
  developed: ["Architected", "Engineered", "Built and scaled"],
  created: ["Designed and implemented", "Architected", "Built from scratch"],
  worked: ["Collaborated with", "Partnered with", "Drove"],
  managed: ["Led", "Directed", "Orchestrated"],
  helped: ["Supported", "Facilitated", "Enabled"],
  improved: ["Optimized", "Enhanced", "Streamlined"],
  made: ["Delivered", "Produced", "Shipped"],
  wrote: ["Authored", "Developed", "Crafted"],
  designed: ["Architected", "Engineered", "Crafted"],
  led: ["Spearheaded", "Directed", "Headed"],
  implemented: ["Rolled out", "Deployed", "Delivered"],
  maintained: ["Owned", "Sustained", "Upheld"],
  handled: ["Resolved", "Managed", "Addressed"],
  responsible: ["Owned", "Led", "Drove"],
  participated: ["Contributed to", "Collaborated on", "Drove"],
  assisted: ["Supported", "Enabled", "Facilitated"],
  involved: ["Contributed to", "Participated in", "Drove"],
};

function extractJdKeywords(jdText: string): string[] {
  const keywords = new Set<string>();
  const lower = jdText.toLowerCase();

  const techPatterns: Array<[RegExp, string]> = [
    [/\b(react|react\.?js|reactjs)\b/i, "React"],
    [/\b(angular|angular\.?js|angularjs)\b/i, "Angular"],
    [/\b(vue|vue\.?js|vuejs)\b/i, "Vue.js"],
    [/\b(next|next\.?js|nextjs)\b/i, "Next.js"],
    [/\b(node|node\.?js|nodejs)\b/i, "Node.js"],
    [/\b(typescript|ts)\b/i, "TypeScript"],
    [/\b(javascript|js)\b/i, "JavaScript"],
    [/\b(python|python3)\b/i, "Python"],
    [/\b(java)(?!\s*script)\b/i, "Java"],
    [/\b(golang|go)\b/i, "Go"],
    [/\b(rust|cargo)\b/i, "Rust"],
    [/\b(docker|container)\b/i, "Docker"],
    [/\b(kubernetes|k8s)\b/i, "Kubernetes"],
    [/\b(aws|amazon web services)\b/i, "AWS"],
    [/\b(azure|microsoft azure)\b/i, "Azure"],
    [/\b(gcp|google cloud)\b/i, "GCP"],
    [/\b(postgres|postgresql)\b/i, "PostgreSQL"],
    [/\b(mysql|mariadb)\b/i, "MySQL"],
    [/\b(mongodb|mongo)\b/i, "MongoDB"],
    [/\b(redis)\b/i, "Redis"],
    [/\b(graphql)\b/i, "GraphQL"],
    [/\b(rest|restful|rest api)\b/i, "REST APIs"],
    [/\b(microservice|micro-services)\b/i, "Microservices"],
    [/\b(ci\/cd|ci cd|continuous integration|continuous delivery)\b/i, "CI/CD"],
    [/\b(terraform|iac|infrastructure as code)\b/i, "Terraform"],
    [/\b(agile|scrum|kanban)\b/i, "Agile"],
    [/\b(testing|unit test|integration test|e2e|jest|pytest)\b/i, "Testing"],
    [/\b(machine learning|ml|ai|artificial intelligence|deep learning)\b/i, "Machine Learning"],
    [/\b(data|analytics|pipeline|etl|data engineering)\b/i, "Data Pipeline"],
    [/\b(git|github|gitlab|bitbucket|version control)\b/i, "Git"],
    [/\b(linux|unix|shell|bash)\b/i, "Linux"],
    [/\b(sql|database|rdbms|relational database)\b/i, "SQL"],
  ];

  const softSkills: Array<[RegExp, string]> = [
    [/\b(leadership|lead|mentor|team lead|tech lead)\b/i, "Leadership"],
    [/\b(collaboration|cross-functional|stakeholder|communication)\b/i, "Cross-functional Collaboration"],
    [/\b(ownership|end-to-end|full lifecycle|ownership)\b/i, "End-to-end Ownership"],
    [/\b(performance|optimization|scalability|performance tuning)\b/i, "Performance"],
    [/\b(system design|architecture|distributed systems)\b/i, "System Design"],
    [/\b(startup|fast-paced|high-growth|scale-up)\b/i, "High-growth Environment"],
    [/\b(customer|user-centric|user experience|ux)\b/i, "Customer Focus"],
  ];

  for (const [pattern, label] of [...techPatterns, ...softSkills]) {
    if (pattern.test(lower)) keywords.add(label);
  }
  return [...keywords].slice(0, 15);
}

function extractBulletPoints(text: string): Array<{ heading: string; bullets: string[] }> {
  const lines = text.split("\n");
  const sections: Array<{ heading: string; bullets: string[] }> = [];
  let currentHeading = "Experience";
  let currentBullets: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^(EXPERIENCE|EDUCATION|SKILLS|PROJECTS?|CERTIFICATION|SUMMARY|PROFESSIONAL|WORK)/i.test(trimmed)) {
      if (currentBullets.length > 0) {
        sections.push({ heading: currentHeading, bullets: currentBullets });
        currentBullets = [];
      }
      currentHeading = trimmed;
    } else {
      const cleanLine = trimmed.replace(/^[-•*·•▪▸›»]\s*/, "");
      if (cleanLine.length > 10) currentBullets.push(cleanLine);
    }
  }
  if (currentBullets.length > 0) {
    sections.push({ heading: currentHeading, bullets: currentBullets });
  }
  return sections;
}

function tailorBullet(
  bullet: string,
  jdKeywords: string[],
  resumeKeywords: string[],
  piiTokens: string[],
): { tailored: string; reason: string; rewritten: boolean } {
  let text = bullet.trim();
  const lower = text.toLowerCase();

  // Find matching JD keywords not already in the bullet
  const missingKeywords = jdKeywords.filter(
    (kw) => !lower.includes(kw.toLowerCase())
  );
  const presentKeywords = jdKeywords.filter(
    (kw) => lower.includes(kw.toLowerCase())
  );

  // Replace weak opening verbs
  let rewritten = false;
  for (const [weak, strongList] of Object.entries(ACTION_VERBS)) {
    const pattern = new RegExp(`^(${weak}[\\w\\s]*)`, "i");
    const match = text.match(pattern);
    if (match && !presentKeywords.some((k) => k.toLowerCase().includes(weak))) {
      const strongVerb = strongList[0];
      text = text.replace(pattern, strongVerb);
      rewritten = true;
      break;
    }
  }

  // Remove buzzwords
  for (const buzz of BUZZWORDS) {
    if (lower.includes(buzz)) {
      text = text.replace(new RegExp(`\\b${buzz}\\b[,;.]?\\s*`, "gi"), "");
      rewritten = true;
    }
  }

  // Add a missing JD keyword naturally if the bullet is short
  if (rewritten && missingKeywords.length > 0 && text.length < 200) {
    const topKeyword = missingKeywords[0];
    const keywordClauses = [
      `, leveraging ${topKeyword} best practices`,
      `, with a focus on ${topKeyword.toLowerCase()}`,
      `, applying ${topKeyword.toLowerCase()} expertise`,
      `, utilizing ${topKeyword}`,
    ];
    text = text.trimEnd().replace(/[.,;]$/, "");
    text += keywordClauses[0];
  }

  // Clean up spacing
  text = text.replace(/\s+/g, " ").trim();

  if (rewritten && missingKeywords.length > 0) {
    return {
      tailored: text,
      reason: `Strengthened opening verb and emphasized ${missingKeywords.slice(0, 2).join(", ")} alignment.`,
      rewritten: true,
    };
  }

  if (rewritten) {
    return {
      tailored: text,
      reason: "Strengthened action verb for greater impact.",
      rewritten: true,
    };
  }

  // Already good but try adding a JD keyword if room
  if (missingKeywords.length > 0 && text.length < 150) {
    return {
      tailored: text + `, aligned with ${missingKeywords[0].toLowerCase()} requirements.`,
      reason: `Added explicit mention of ${missingKeywords[0]} to match JD.`,
      rewritten: true,
    };
  }

  return {
    tailored: text,
    reason: presentKeywords.length > 0
      ? `Already well-aligned with JD keywords: ${presentKeywords.slice(0, 2).join(", ")}.`
      : "Bullet already reads clearly and professionally.",
    rewritten: false,
  };
}

export async function tailorResume(
  resumeText: string,
  jdText: string,
): Promise<TailorResult> {
  const jdKeywords = extractJdKeywords(jdText);
  const resumeKeywords = extractJdKeywords(resumeText);
  const sections = extractBulletPoints(resumeText);

  if (sections.length === 0) {
    return {
      sections: [],
      stats: { bulletPointsRewritten: 0, keywordsAdded: 0, buzzwordsRemoved: 0, bulletPointsTotal: 0 },
    };
  }

  // Try LLM path first if available
  if (!isMockMode()) {
    try {
      return await llmTailor(resumeText, jdText);
    } catch {
      // Fall through to heuristic
    }
  }

  // Heuristic tailoring
  const result: TailoredSection[] = [];
  let rewritten = 0;
  let keywordsAdded = 0;
  let buzzwordsRemoved = 0;
  let total = 0;

  for (const section of sections) {
    const tailoredBullets: string[] = [];
    const reasons: string[] = [];

    for (const bullet of section.bullets) {
      total++;
      const tailored = tailorBullet(bullet, jdKeywords, resumeKeywords, []);
      tailoredBullets.push(tailored.tailored);
      reasons.push(tailored.reason);
      if (tailored.rewritten) {
        rewritten++;
        if (tailored.reason.includes("keyword")) keywordsAdded++;
        if (tailored.reason.includes("buzzword") || tailored.reason.includes("action verb")) buzzwordsRemoved++;
      }
    }

    if (tailoredBullets.length > 0) {
      result.push({
        section: section.heading,
        original: section.bullets.join("\n"),
        tailored: tailoredBullets.join("\n"),
        reason: reasons.join(" | "),
      });
    }
  }

  return { sections: result, stats: { bulletPointsRewritten: rewritten, keywordsAdded, buzzwordsRemoved, bulletPointsTotal: total } };
}

async function llmTailor(resumeText: string, jdText: string): Promise<TailorResult> {
  const template = await loadCachedPrompt("resume", "tailor");
  const jdKeywords = extractJdKeywords(jdText);

  const prompt = renderPrompt(template, {
    original_bullet: resumeText,
    jd_excerpt: jdText.slice(0, 3000),
    target_skills: jdKeywords.join(", "),
  });

  const response = await llm.complete(prompt);
  const parsed = JSON.parse(response.content);

  const sections: TailoredSection[] = [{
    section: "Full Resume",
    original: resumeText,
    tailored: parsed.tailored || resumeText,
    reason: parsed.reason || "Tailored using AI to match job description requirements.",
  }];

  return {
    sections,
    stats: {
      bulletPointsRewritten: 1,
      keywordsAdded: parsed.keywordsMatched || 0,
      buzzwordsRemoved: 0,
      bulletPointsTotal: 1,
    },
  };
}
