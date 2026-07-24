"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, RefreshCw, Sparkles, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Application, ApplicationStatus } from "@jobplatform/shared";
import { listApplications, updateApplicationRecord } from "@/lib/applications-client";
import { generateOutreach } from "@/lib/outreach";
import { buildSelectedJobMap, loadSelectedJobs } from "@/lib/selected-jobs";
import type { Job } from "@/components/jobs/JobCard";

const STATUS_COLUMNS: Array<{
  key: ApplicationStatus;
  label: string;
  accent: string;
}> = [
  { key: "discovered", label: "Discovered", accent: "bg-slate-50" },
  { key: "analyzed", label: "Analyzed", accent: "bg-blue-50" },
  { key: "tailored", label: "Tailored", accent: "bg-purple-50" },
  { key: "outreach_sent", label: "Outreach Sent", accent: "bg-amber-50" },
  { key: "applied", label: "Applied", accent: "bg-orange-50" },
  { key: "interview", label: "Interview", accent: "bg-emerald-50" },
  { key: "offer", label: "Offer", accent: "bg-teal-50" },
  { key: "rejected", label: "Rejected", accent: "bg-red-50" },
  { key: "closed", label: "Closed", accent: "bg-gray-50" },
];

const NEXT_STATUS: Partial<Record<ApplicationStatus, ApplicationStatus>> = {
  discovered: "analyzed",
  analyzed: "tailored",
  tailored: "outreach_sent",
  outreach_sent: "applied",
  applied: "interview",
  interview: "offer",
  offer: "closed",
  rejected: "closed",
};

export default function TrackerPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const jobMap = useMemo(() => buildSelectedJobMap(selectedJobs), [selectedJobs]);

  const loadTrackerData = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      const [apps, jobs] = await Promise.all([
        listApplications(),
        Promise.resolve(loadSelectedJobs()),
      ]);

      setApplications(apps);
      setSelectedJobs(jobs);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadTrackerData();
  }, [loadTrackerData]);

  const stats = useMemo(() => {
    const total = applications.length;
    const syncedResumes = applications.filter((app) => Boolean(app.resumeId)).length;
    const avgMatchScoreValues = applications
      .map((app) => app.matchScore)
      .filter((score): score is number => typeof score === "number");
    const avgMatchScore =
      avgMatchScoreValues.length > 0
        ? Math.round(
            avgMatchScoreValues.reduce((sum, score) => sum + score, 0) /
              avgMatchScoreValues.length,
          )
        : null;
    const tailored = applications.filter((app) => app.status === "tailored").length;
    const outreach = applications.filter((app) =>
      ["outreach_sent", "applied", "interview", "offer"].includes(app.status),
    );
    const replied = applications.filter((app) =>
      ["interview", "offer"].includes(app.status),
    );
    const responseRate =
      outreach.length > 0
        ? Math.round((replied.length / outreach.length) * 100)
        : 0;

    return {
      total,
      syncedResumes,
      avgMatchScore,
      tailored,
      responseRate,
    };
  }, [applications]);

  const handleGenerateOutreach = useCallback(
    async (application: Application, job: Job | undefined) => {
      setUpdatingId(application.id);
      setError(null);

      try {
        await generateOutreach({
          applicationId: application.id,
          recipientName: job?.company ?? "",
          recipientEmail: "",
          job: job as unknown as Record<string, unknown>,
          application: application as unknown as Record<string, unknown>,
        });
        setError(`Outreach email drafted for ${job?.company ?? "job"}. Check the Outreach Console to send it.`);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setUpdatingId(null);
      }
    },
    [],
  );

  const handleAdvance = useCallback(
    async (application: Application) => {
      const nextStatus = NEXT_STATUS[application.status];
      if (!nextStatus) {
        return;
      }

      setUpdatingId(application.id);
      setError(null);

      try {
        await updateApplicationRecord({
          id: application.id,
          status: nextStatus,
          notes: `Moved from ${application.status} to ${nextStatus} in Application Tracker.`,
        });
        await loadTrackerData();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setUpdatingId(null);
      }
    },
    [loadTrackerData],
  );

  const groupedApplications = useMemo(() => {
    return Object.fromEntries(
      STATUS_COLUMNS.map((column) => [
        column.key,
        applications.filter((application) => application.status === column.key),
      ]),
    ) as Record<ApplicationStatus, Application[]>;
  }, [applications]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Application Tracker</h1>
          <p className="text-muted-foreground">
            Track each resume from analysis to outreach, with live updates from Resume Studio.
          </p>
        </div>
        <Button variant="outline" onClick={() => void loadTrackerData()} disabled={isRefreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Synced Resumes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.syncedResumes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Match Score</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {stats.avgMatchScore !== null ? stats.avgMatchScore : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.responseRate}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-4 w-4" />
            Resume Studio Hook
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {selectedJobs.length > 0 ? (
            <div className="space-y-2">
              <p>
                {selectedJobs.length} selected job
                {selectedJobs.length === 1 ? "" : "s"} are linked from the Dashboard and will
                appear here when Resume Studio runs analysis or export.
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedJobs.map((job) => (
                  <Badge key={job.id} variant="secondary">
                    {job.title}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <p>
              Select jobs on the Dashboard first, then open Resume Studio to push them into
              the tracker.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-4 pb-4">
          {STATUS_COLUMNS.map((column) => {
            const columnApplications = groupedApplications[column.key];

            return (
              <div
                key={column.key}
                className={`w-72 shrink-0 rounded-lg border ${column.accent} p-3`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium">{column.label}</h3>
                  <Badge variant="outline" className="text-xs">
                    {columnApplications.length}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {columnApplications.length === 0 ? (
                    <div className="rounded-md border bg-white p-3 text-sm text-muted-foreground">
                      No applications in this stage yet.
                    </div>
                  ) : (
                    columnApplications.map((application) => {
                      const job = jobMap[application.jobId];
                      const nextStatus = NEXT_STATUS[application.status];

                      return (
                        <div
                          key={application.id}
                          className="rounded-md border bg-white p-3 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {job?.title ?? `Job ${application.jobId.slice(0, 8)}`}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {job?.company ?? "Unknown company"}
                              </p>
                            </div>
                            {application.matchScore !== undefined && (
                              <Badge variant="secondary" className="shrink-0">
                                {application.matchScore}
                              </Badge>
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <Badge variant="outline" className="text-xs capitalize">
                              {application.status.replace(/_/g, " ")}
                            </Badge>
                            {application.resumeId && (
                              <Badge variant="outline" className="text-xs">
                                Resume linked
                              </Badge>
                            )}
                          </div>

                          {application.notes && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              {application.notes}
                            </p>
                          )}

                          <div className="mt-3 flex items-center justify-between gap-2">
                            {application.status === "tailored" ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => void handleGenerateOutreach(application, job)}
                                disabled={updatingId === application.id}
                              >
                                <Send className="mr-1 h-3.5 w-3.5" />
                                {updatingId === application.id ? "Generating..." : "Send Email"}
                              </Button>
                            ) : (
                              <div className="text-xs text-muted-foreground">
                                {job?.source ?? "Local tracker"}
                              </div>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void handleAdvance(application)}
                              disabled={!nextStatus || updatingId === application.id}
                            >
                              {updatingId === application.id ? (
                                "Updating..."
                              ) : nextStatus ? (
                                <>
                                  Advance
                                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                                </>
                              ) : (
                                "Done"
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isLoading && (
        <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
          Loading tracker data...
        </div>
      )}
    </div>
  );
}
