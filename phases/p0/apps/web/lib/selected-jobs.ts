import type { Job } from "@/components/jobs/JobCard";

export const SELECTED_JOBS_STORAGE_KEY = "jobplatform:selected-jobs";

export function loadSelectedJobs(): Job[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SELECTED_JOBS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isJobLike).map(normalizeJob);
  } catch {
    return [];
  }
}

export function saveSelectedJobs(jobs: Job[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SELECTED_JOBS_STORAGE_KEY, JSON.stringify(jobs));
}

export function buildSelectedJobMap(jobs: Job[]): Record<string, Job> {
  return Object.fromEntries(jobs.map((job) => [job.id, job]));
}

function isJobLike(value: unknown): value is Job {
  if (!value || typeof value !== "object") {
    return false;
  }

  const job = value as Partial<Job>;
  return (
    typeof job.id === "string" &&
    typeof job.title === "string" &&
    typeof job.company === "string" &&
    typeof job.location === "string" &&
    typeof job.postedAt === "string" &&
    typeof job.url === "string" &&
    typeof job.source === "string" &&
    typeof job.description === "string"
  );
}

function normalizeJob(job: Job): Job {
  return {
    ...job,
    remote: job.remote ?? null,
    experience: job.experience ?? null,
    salary: job.salary ?? null,
  };
}
