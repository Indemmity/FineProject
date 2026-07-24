import type { Job } from "@/components/jobs/JobCard";
import { getCompanyHREmail } from "@jobplatform/shared/lib/company-emails";

export interface HarvesterJobResponse {
  id: string;
  source: string;
  source_id: string;
  title: string;
  company: string;
  location: string | null;
  description: string;
  description_html: string;
  salary_range: string | null;
  job_type: string | null;
  remote: boolean;
  experience_level: string | null;
  posted_date: string | null;
  url: string;
  search_keyword: string;
  scraped_at: string;
  skills?: string[];
  contact_email?: string;
}

interface JobListResponse {
  jobs: HarvesterJobResponse[];
}

interface JobSearchResponse {
  search_id: string;
  status: string;
  progress: number;
  results: HarvesterJobResponse[];
  error?: string | null;
}

const STOP_WORDS = new Set([
  "and",
  "for",
  "from",
  "in",
  "of",
  "or",
  "the",
  "to",
  "with",
]);

export function buildSearchKeywords(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token))
    .filter((token, index, tokens) => tokens.indexOf(token) === index);
}

export function normalizeWorkMode(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase().replace(/[^a-z]/g, "");
  if (normalized.includes("remote")) {
    return "remote";
  }
  if (normalized.includes("hybrid")) {
    return "hybrid";
  }
  if (normalized.includes("onsite") || normalized.includes("office")) {
    return "onsite";
  }

  return normalized || null;
}

export function normalizeExperienceLevel(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase().trim();
  if (!normalized) {
    return null;
  }

  if (
    normalized.includes("entry") ||
    normalized.includes("junior") ||
    normalized.includes("intern") ||
    normalized.includes("graduate")
  ) {
    return "entry";
  }

  if (normalized.includes("mid") || normalized.includes("associate")) {
    return "mid";
  }

  if (normalized.includes("senior") || normalized.includes(" sr")) {
    return "senior";
  }

  if (
    normalized.includes("lead") ||
    normalized.includes("manager") ||
    normalized.includes("staff") ||
    normalized.includes("principal") ||
    normalized.includes("director") ||
    normalized.includes("head") ||
    normalized.includes("vp") ||
    normalized.includes("chief")
  ) {
    return "lead";
  }

  if (["entry", "mid", "senior", "lead"].includes(normalized)) {
    return normalized;
  }

  return null;
}

export function matchesJobQuery(
  job: Pick<Job, "title" | "company" | "location" | "description">,
  query: string,
): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return true;
  }

  const searchable = `${job.title} ${job.company} ${job.location ?? ""} ${job.description}`.toLowerCase();
  if (searchable.includes(trimmed)) {
    return true;
  }

  return buildSearchKeywords(query).some((keyword) => searchable.includes(keyword));
}

export function toFrontendJob(job: HarvesterJobResponse): Job {
  const experienceLevel = normalizeExperienceLevel(job.experience_level) ?? inferExperienceLevel(job.title);
  const workMode = inferWorkMode(job);
  const skills = job.skills || extractSkills(job.description, job.description_html);
  const contactEmail = job.contact_email || extractEmail(job.description, job.description_html) || getCompanyHREmail(job.company);

  return {
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location?.trim() || (workMode === "Remote" ? "Remote" : "Unknown location"),
    remote: workMode,
    experience: formatExperience(experienceLevel),
    postedAt: job.posted_date ?? job.scraped_at,
    url: job.url || "#",
    source: formatSource(job.source),
    description: job.description?.trim() || stripHtml(job.description_html),
    salary: job.salary_range,
    skills,
    contactEmail,
  };
}

export async function listJobs(options?: {
  source?: string;
  keyword?: string;
  limit?: number;
  offset?: number;
}): Promise<Job[]> {
  const params = new URLSearchParams();
  if (options?.source) {
    params.set("source", options.source);
  }
  if (options?.keyword) {
    params.set("keyword", options.keyword);
  }
  if (typeof options?.limit === "number") {
    params.set("limit", String(options.limit));
  }
  if (typeof options?.offset === "number") {
    params.set("offset", String(options.offset));
  }

  const query = params.toString();
  const data = await fetchJson<JobListResponse>(`/api/jobs${query ? `?${query}` : ""}`);
  return (data.jobs ?? []).map(toFrontendJob);
}

export async function searchJobs(options: {
  query: string;
  location?: string;
  remoteOnly?: boolean;
  experienceLevel?: string | null;
  datePosted?: number | null;
  source?: string | null;
}): Promise<Job[]> {
  const queryKeywords = buildSearchKeywords(options.query);
  const locationKeywords = buildSearchKeywords(options.location ?? "");
  const keywords = queryKeywords.length > 0 ? queryKeywords : locationKeywords;

  if (keywords.length === 0) {
    return listJobs({ limit: 100 });
  }

  const params = new URLSearchParams();
  params.set("q", keywords.join(","));
  if (options.location) {
    params.set("location", options.location);
  }
  if (options.remoteOnly) {
    params.set("remote_only", "true");
  }
  if (options.experienceLevel) {
    params.set("experience_level", options.experienceLevel);
  }
  if (typeof options.datePosted === "number") {
    params.set("date_posted", String(options.datePosted));
  }

  const data = await fetchJson<JobSearchResponse>(`/api/jobs/search?${params.toString()}`);

  if (data.status === "failed") {
    throw new Error(data.error ?? "Job search failed");
  }

  let results = data.results ?? [];

  if (options.source) {
    const sourceLower = options.source.toLowerCase();
    results = results.filter((j) => j.source.toLowerCase() === sourceLower);
  }

  return results.map(toFrontendJob);
}

async function fetchJson<T>(input: RequestInfo | URL): Promise<T> {
  const response = await fetch(input, { cache: "no-store" });
  if (!response.ok) {
    let message = response.statusText || "Request failed";
    try {
      const payload = (await response.json()) as { error?: string; detail?: string };
      message = payload.error ?? payload.detail ?? message;
    } catch {
      // Ignore non-JSON error bodies.
    }
    throw new Error(message);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new Error("Unexpected response from server");
  }
}

function inferWorkMode(job: HarvesterJobResponse): string | null {
  const text = [job.job_type, job.location, job.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (job.remote || text.includes("remote") || text.includes("work from home") || text.includes("wfh")) {
    return "Remote";
  }
  if (text.includes("hybrid")) {
    return "Hybrid";
  }
  if (
    text.includes("on-site") ||
    text.includes("onsite") ||
    text.includes("in office") ||
    text.includes("office")
  ) {
    return "On-site";
  }

  return job.location ? "On-site" : null;
}

function inferExperienceLevel(title: string): string | null {
  const lower = title.toLowerCase();

  if (
    lower.includes("entry") ||
    lower.includes("junior") ||
    lower.includes("intern") ||
    lower.includes("graduate")
  ) {
    return "entry";
  }
  if (lower.includes("mid") || lower.includes("associate")) {
    return "mid";
  }
  if (lower.includes("senior") || lower.includes(" sr")) {
    return "senior";
  }
  if (
    lower.includes("lead") ||
    lower.includes("manager") ||
    lower.includes("staff") ||
    lower.includes("principal") ||
    lower.includes("director") ||
    lower.includes("head") ||
    lower.includes("vp") ||
    lower.includes("chief")
  ) {
    return "lead";
  }

  return null;
}

function formatExperience(level: string | null): string | null {
  switch (level) {
    case "entry":
      return "Entry Level";
    case "mid":
      return "Mid Level";
    case "senior":
      return "Senior";
    case "lead":
      return "Lead / Manager";
    default:
      return null;
  }
}

function formatSource(source: string): string {
  const normalized = source.trim();
  if (!normalized) {
    return "Unknown";
  }
  if (normalized.toLowerCase() === "remoteok") {
    return "RemoteOK";
  }

  return normalized
    .split(/[-_ ]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSkills(description: string, html: string): string[] {
  const text = (description || stripHtml(html)).toLowerCase();
  const skillKeywords = [
    'java', 'python', 'javascript', 'react', 'angular', 'vue', 'node.js', 'spring',
    'hibernate', 'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'sql', 'mongodb',
    'postgresql', 'mysql', 'git', 'jenkins', 'ci/cd', 'agile', 'scrum', 'typescript',
    'html', 'css', 'sass', 'webpack', 'rest api', 'graphql', 'microservices',
    'linux', 'unix', 'shell scripting', 'bash', 'python', 'ruby', 'go', 'rust',
    'machine learning', 'ai', 'data science', 'devops', 'testing', 'junit',
    'maven', 'gradle', 'npm', 'yarn', 'webpack', 'babel', 'eslint', 'prettier'
  ];
  
  const foundSkills = skillKeywords.filter(skill => text.includes(skill));
  return [...new Set(foundSkills)]; // Remove duplicates
}

function extractEmail(description: string, html: string): string | undefined {
  const text = description || stripHtml(html);
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex);
  
  if (matches && matches.length > 0) {
    // Return the first email found
    return matches[0];
  }
  
  return undefined;
}
