/**
 * Stats aggregation — aggregates application metrics from the applications store.
 */

import { getApplicationStats, listApplications } from "./applications";

export interface DashboardStats {
  totalJobsDiscovered: number;
  totalApplications: number;
  totalOutreachSent: number;
  responseRate: number;
  avgMatchScore: number | null;
  byStatus: Record<string, number>;
}

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const byStatus = await getApplicationStats(userId);
  const apps = await listApplications(userId);

  const outreach = apps.filter(
    (a) =>
      a.status === "outreach_sent" ||
      a.status === "applied" ||
      a.status === "interview" ||
      a.status === "offer",
  );
  const replied = apps.filter(
    (a) => a.status === "interview" || a.status === "offer",
  );

  const scores = apps
    .map((a) => a.matchScore)
    .filter((s): s is number => s != null);

  return {
    totalJobsDiscovered: byStatus.discovered ?? 0,
    totalApplications: apps.length,
    totalOutreachSent: outreach.length,
    responseRate:
      outreach.length > 0
        ? Math.round((replied.length / outreach.length) * 100)
        : 0,
    avgMatchScore:
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null,
    byStatus,
  };
}
