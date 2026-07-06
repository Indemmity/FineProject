import type { Application, ApplicationStatus } from "@jobplatform/shared";

export interface ApplicationCreateInput {
  jobId: string;
  resumeId?: string;
}

export interface ApplicationUpdateInput {
  id: string;
  status?: ApplicationStatus;
  notes?: string;
  matchScore?: number;
  resumeId?: string;
  gapAnalysis?: unknown[];
  tailoredResumeText?: string;
}

interface ApplicationsListResponse {
  applications: Application[];
}

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    let message = "Request failed";
    try {
      const payload = (await response.json()) as { error?: string };
      message = payload.error ?? message;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function listApplications(): Promise<Application[]> {
  const data = await fetchJson<ApplicationsListResponse>("/api/applications");
  return data.applications ?? [];
}

export async function createApplicationRecord(
  input: ApplicationCreateInput,
): Promise<Application> {
  return fetchJson<Application>("/api/applications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function updateApplicationRecord(
  input: ApplicationUpdateInput,
): Promise<Application> {
  return fetchJson<Application>("/api/applications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}
