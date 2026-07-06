import type { GapItem, MatchResult, ApplicationStatus } from "@jobplatform/shared";
import type { Job } from "@/components/jobs/JobCard";
import {
  createApplicationRecord,
  listApplications,
  updateApplicationRecord,
} from "./applications-client";

export interface ResumeTrackerSyncInput {
  resumeId: string;
  jobs: Job[];
  targetStatus: "analyzed" | "tailored";
  analysis?: MatchResult | null;
  gaps?: GapItem[];
  tailoredText?: string | null;
}

export interface ResumeTrackerSyncResult {
  syncedCount: number;
  applications: string[];
}

const STATUS_RANK: Record<ApplicationStatus, number> = {
  discovered: 0,
  analyzed: 1,
  tailored: 2,
  outreach_sent: 3,
  applied: 4,
  interview: 5,
  offer: 6,
  rejected: 7,
  closed: 8,
};

export async function syncResumeTracker(
  input: ResumeTrackerSyncInput,
): Promise<ResumeTrackerSyncResult> {
  if (input.jobs.length === 0) {
    return { syncedCount: 0, applications: [] };
  }

  const existingApplications = await listApplications();
  const byKey = new Map(
    existingApplications.map((application) => [
      getApplicationKey(application.jobId, application.resumeId),
      application,
    ]),
  );

  const synced: string[] = [];

  for (const job of input.jobs) {
    const application = await syncSingleJob({
      job,
      resumeId: input.resumeId,
      targetStatus: input.targetStatus,
      analysis: input.analysis ?? null,
      gaps: input.gaps ?? [],
      tailoredText: input.tailoredText ?? null,
      current: byKey.get(getApplicationKey(job.id, input.resumeId)) ?? null,
    });

    byKey.set(getApplicationKey(job.id, input.resumeId), application);
    synced.push(application.id);
  }

  return { syncedCount: synced.length, applications: synced };
}

async function syncSingleJob({
  job,
  resumeId,
  targetStatus,
  analysis,
  gaps,
  tailoredText,
  current,
}: {
  job: Job;
  resumeId: string;
  targetStatus: "analyzed" | "tailored";
  analysis: MatchResult | null;
  gaps: GapItem[];
  tailoredText: string | null;
  current: Awaited<ReturnType<typeof listApplications>>[number] | null;
}) {
  let application = current;

  if (!application) {
    application = await createApplicationRecord({ jobId: job.id, resumeId });
  }

  const analysisUpdates = {
    resumeId,
    matchScore: analysis?.score,
    gapAnalysis: gaps,
    notes: buildNotes("analyzed", job.title),
  };

  const tailoredUpdates = {
    resumeId,
    matchScore: analysis?.score,
    gapAnalysis: gaps,
    tailoredResumeText: tailoredText ?? undefined,
    notes: buildNotes("tailored", job.title),
  };

  if (targetStatus === "analyzed") {
    if (STATUS_RANK[application.status] < STATUS_RANK.analyzed) {
      application = await updateApplicationRecord({
        id: application.id,
        status: "analyzed",
        ...analysisUpdates,
      });
      return application;
    }

    return updateApplicationRecord({
      id: application.id,
      ...analysisUpdates,
    });
  }

  if (STATUS_RANK[application.status] < STATUS_RANK.analyzed) {
    application = await updateApplicationRecord({
      id: application.id,
      status: "analyzed",
      ...analysisUpdates,
    });
  }

  if (STATUS_RANK[application.status] < STATUS_RANK.tailored) {
    return updateApplicationRecord({
      id: application.id,
      status: "tailored",
      ...tailoredUpdates,
    });
  }

  return updateApplicationRecord({
    id: application.id,
    ...tailoredUpdates,
  });
}

function getApplicationKey(jobId: string, resumeId?: string): string {
  return `${jobId}:${resumeId ?? ""}`;
}

function buildNotes(stage: "analyzed" | "tailored", title: string): string {
  if (stage === "analyzed") {
    return `Resume Studio analyzed this role for ${title}.`;
  }

  return `Resume Studio tailored the resume for ${title}.`;
}
