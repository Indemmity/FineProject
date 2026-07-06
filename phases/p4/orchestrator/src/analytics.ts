/**
 * Analytics consumer — listens to platform events and aggregates dashboard metrics.
 * Uses in-process event handling (no external dependencies).
 */

import { eventBus } from "./pipeline";

interface AggregatedStats {
  totalJobsDiscovered: number;
  totalResumesUploaded: number;
  totalResumesAnalyzed: number;
  totalTailored: number;
  totalOutreachSent: number;
  totalOutreachOpened: number;
  totalOutreachReplied: number;
  totalPipelinesCompleted: number;
  avgMatchScore: number;
  matchScoreSamples: number;
}

const stats: AggregatedStats = {
  totalJobsDiscovered: 0,
  totalResumesUploaded: 0,
  totalResumesAnalyzed: 0,
  totalTailored: 0,
  totalOutreachSent: 0,
  totalOutreachOpened: 0,
  totalOutreachReplied: 0,
  totalPipelinesCompleted: 0,
  avgMatchScore: 0,
  matchScoreSamples: 0,
};

export function startAnalyticsConsumer(): void {
  eventBus.on("job.search.completed", () => {
    stats.totalJobsDiscovered++;
  });

  eventBus.on("resume.uploaded", () => {
    stats.totalResumesUploaded++;
  });

  eventBus.on("resume.analyzed", (event: unknown) => {
    stats.totalResumesAnalyzed++;
    const data = (event as { data?: Record<string, unknown> }).data;
    const score = data?.score as number | undefined;
    if (score != null) {
      stats.avgMatchScore =
        (stats.avgMatchScore * stats.matchScoreSamples + score) /
        (stats.matchScoreSamples + 1);
      stats.matchScoreSamples++;
    }
  });

  eventBus.on("resume.tailored", () => {
    stats.totalTailored++;
  });

  eventBus.on("outreach.sent", () => {
    stats.totalOutreachSent++;
  });

  eventBus.on("outreach.tracked", (event: unknown) => {
    const data = (event as { data?: Record<string, unknown> }).data;
    const evt = data?.event as string | undefined;
    if (evt === "opened") stats.totalOutreachOpened++;
    if (evt === "replied") stats.totalOutreachReplied++;
  });

  eventBus.on("pipeline.completed", () => {
    stats.totalPipelinesCompleted++;
  });

  console.log("[analytics] Consumer started");
}

export function getStats(): AggregatedStats {
  return { ...stats };
}