"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { Job } from "@/components/jobs/JobCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileUploader,
  type FileUploaderHandle,
} from "@/components/resume/FileUploader";
import { ScoreGauge } from "@/components/resume/ScoreGauge";
import { GapList } from "@/components/resume/GapList";
import { DiffViewer } from "@/components/resume/DiffViewer";
import { TailorButton } from "@/components/resume/TailorButton";
import { DownloadButton } from "@/components/resume/DownloadButton";
import { GuardrailBadge } from "@/components/resume/GuardrailBadge";
import { Loader2, ArrowRight, RefreshCw, Upload, X } from "lucide-react";
import type { GapItem as SharedGapItem, MatchResult } from "@jobplatform/shared";
import { loadSelectedJobs } from "@/lib/selected-jobs";
import { syncResumeTracker } from "@/lib/resume-tracker";

interface UploadResult {
  id: string;
  filename: string;
  format: string;
  wordCount: number;
  text: string;
}

interface AnalysisResult {
  score: number;
  skillBreakdown: {
    skill: string;
    level: "beginner" | "intermediate" | "advanced" | "expert";
    relevance: number;
  }[];
  strengths: string[];
  weaknesses: string[];
}

interface GapItem {
  skill: string;
  importance: "high" | "medium" | "low";
  category: string;
  suggestedAction: string;
}

type DiffType = "unchanged" | "added" | "removed" | "modified";
type GuardrailIssueType = "error" | "warning";
type GuardrailSeverity = "low" | "medium" | "high";

interface TailorResult {
  original: string;
  tailored: string;
  sections: { section: string; original: string; tailored: string; reason: string }[];
  diff: { type: DiffType; originalLine: string; tailoredLine: string; lineNumber: number; reason?: string }[];
  guardrails: { passed: boolean; issues: { type: GuardrailIssueType; field: string; message: string }[]; severity: GuardrailSeverity };
}

type StudioStep = "upload" | "analyze" | "tailor" | "export";

export default function ResumeStudioPage() {
  const [step, setStep] = useState<StudioStep>("upload");
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [jdText, setJdText] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [gaps, setGaps] = useState<GapItem[]>([]);
  const [tailorResult, setTailorResult] = useState<TailorResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSyncingTracker, setIsSyncingTracker] = useState(false);
  const [trackerMessage, setTrackerMessage] = useState<string | null>(null);
  const [selectedJobs, setSelectedJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);
  const uploaderRef = useRef<FileUploaderHandle>(null);
  const jdTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setSelectedJobs(loadSelectedJobs());
  }, []);

  const handleUploadComplete = useCallback((result: UploadResult) => {
    setUploadResult(result);
    setStep("analyze");
    setError(null);
    setTrackerMessage(null);
    setIsSyncingTracker(false);
  }, []);

  const handleUploadError = useCallback((msg: string) => {
    setError(msg);
  }, []);

  const handleOpenFilePicker = useCallback(() => {
    uploaderRef.current?.openFilePicker();
  }, []);

  const handleJumpToAnalysis = useCallback(() => {
    if (!uploadResult) return;

    setError(null);
    setStep("analyze");
    window.setTimeout(() => {
      jdTextareaRef.current?.focus();
    }, 0);
  }, [uploadResult]);

  const syncTracker = useCallback(
    async (
      targetStatus: "analyzed" | "tailored",
      options?: {
        analysisData?: AnalysisResult | null;
        gapData?: GapItem[];
        tailoredText?: string | null;
      },
    ) => {
      if (!uploadResult) {
        return;
      }

      if (selectedJobs.length === 0) {
        setTrackerMessage("Select jobs on the Dashboard to sync with the tracker.");
        return;
      }

      setIsSyncingTracker(true);
      setTrackerMessage(null);

      try {
        const analysisData = options?.analysisData ?? analysis;
        const gapData = options?.gapData ?? gaps;
        const tailoredText = options?.tailoredText ?? tailorResult?.tailored ?? null;

        const result = await syncResumeTracker({
          resumeId: uploadResult.id,
          jobs: selectedJobs,
          targetStatus,
          analysis: analysisData as MatchResult | null,
          gaps: gapData as SharedGapItem[],
          tailoredText,
        });

        const noun = result.syncedCount === 1 ? "job" : "jobs";
        setTrackerMessage(
          `Synced ${result.syncedCount} ${noun} to Application Tracker as ${targetStatus}.`,
        );
      } catch (err) {
        console.error("[resume/tracker] Sync failed:", err);
        setTrackerMessage("Application Tracker sync is not available right now.");
      } finally {
        setIsSyncingTracker(false);
      }
    },
    [analysis, gaps, selectedJobs, tailorResult, uploadResult],
  );

  const handleAnalyze = useCallback(async () => {
    if (!uploadResult || !jdText.trim()) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const res = await fetch(`/api/resume/${uploadResult.id}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdText: jdText.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Analysis failed");
      }

      const data = await res.json();
      setAnalysis(data.analysis);
      setGaps(data.gaps ?? []);
      setStep("tailor");
      void syncTracker("analyzed", {
        analysisData: data.analysis,
        gapData: data.gaps ?? [],
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsAnalyzing(false);
    }
  }, [uploadResult, jdText, syncTracker]);

  const handleTailor = useCallback(async () => {
    if (!uploadResult || !jdText.trim()) return;

    try {
      const res = await fetch(`/api/resume/${uploadResult.id}/tailor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdText: jdText.trim() }),
      });

      if (!res.ok) {
        let errorMessage = "Tailoring failed";
        try {
          const err = await res.json();
          errorMessage = err.error ?? errorMessage;
        } catch {}
        throw new Error(errorMessage);
      }

      const data = (await res.json()) as TailorResult;
      setTailorResult(data);
      setStep("export");
    } catch (err) {
      setError((err as Error).message);
    }
  }, [uploadResult, jdText]);

  const handleExportSuccess = useCallback(async () => {
    await syncTracker("tailored");
  }, [syncTracker]);

  const handleReset = useCallback(() => {
    uploaderRef.current?.clearSelection();
    setUploadResult(null);
    setJdText("");
    setAnalysis(null);
    setGaps([]);
    setTailorResult(null);
    setError(null);
    setTrackerMessage(null);
    setIsSyncingTracker(false);
    setStep("upload");
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resume Studio</h1>
          <p className="text-muted-foreground">
            Upload, analyze, tailor, and export your resumes.
          </p>
        </div>
        {uploadResult && (
          <Button variant="outline" size="sm" onClick={handleReset}>
            <X className="mr-2 h-4 w-4" /> New Resume
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card className={step === "upload" ? "" : "hidden"}>
            <CardHeader>
              <CardTitle className="text-lg">Upload Resume</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUploader
                ref={uploaderRef}
                onUploadComplete={(result) =>
                  handleUploadComplete(result as unknown as UploadResult)
                }
                onError={handleUploadError}
              />
            </CardContent>
          </Card>

          {uploadResult && (
            <Card>
              <CardHeader>
                <CardTitle>Current Resume</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{uploadResult.filename}</p>
                    <p className="text-sm text-muted-foreground">
                      {uploadResult.wordCount} words &middot; {uploadResult.format.toUpperCase()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedJobs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Linked Tracker Jobs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  These jobs will move into the Application Tracker when you analyze and
                  export this resume.
                </p>
                <ul className="space-y-2">
                  {selectedJobs.map((job) => (
                    <li key={job.id} className="rounded-md border px-3 py-2 text-sm">
                      <p className="font-medium">{job.title}</p>
                      <p className="text-xs text-muted-foreground">{job.company}</p>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">
                  {isSyncingTracker
                    ? "Syncing this resume to the tracker..."
                    : trackerMessage ?? "Tracker sync is ready once analysis finishes."}
                </p>
              </CardContent>
            </Card>
          )}

          {(step === "analyze" || step === "tailor" || step === "export") && (
            <Card>
              <CardHeader>
                <CardTitle>Job Description</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <textarea
                  ref={jdTextareaRef}
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  placeholder="Paste the job description here to analyze your resume against it..."
                  className="min-h-[160px] w-full rounded-md border border-input bg-background p-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={isAnalyzing}
                />
                {step === "analyze" && (
                  <Button onClick={handleAnalyze} disabled={isAnalyzing || !jdText.trim()}>
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      "Analyze Resume"
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {analysis && (
            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Match Score</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <ScoreGauge score={analysis.score} />
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-green-600">Strengths</p>
                    <ul className="list-inside list-disc text-sm text-muted-foreground">
                      {analysis.strengths.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-600">Weaknesses</p>
                    <ul className="list-inside list-disc text-sm text-muted-foreground">
                      {analysis.weaknesses.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {gaps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Skill Gaps</CardTitle>
              </CardHeader>
              <CardContent>
                <GapList gaps={gaps} />
              </CardContent>
            </Card>
          )}

          {step === "tailor" && analysis && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tailor Resume</CardTitle>
              </CardHeader>
              <CardContent>
                <TailorButton onClick={handleTailor} />
              </CardContent>
            </Card>
          )}

          {tailorResult && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resume Diff</CardTitle>
                </CardHeader>
                <CardContent>
                  <DiffViewer diffs={tailorResult.diff} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Guardrail Check</CardTitle>
                </CardHeader>
                <CardContent>
                  <GuardrailBadge
                    passed={tailorResult.guardrails.passed}
                    issues={tailorResult.guardrails.issues}
                    severity={tailorResult.guardrails.severity}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Export</CardTitle>
                </CardHeader>
                <CardContent>
                  <DownloadButton
                    resumeId={uploadResult!.id}
                    tailoredText={tailorResult.tailored}
                    analysis={analysis ?? undefined}
                    guardrails={tailorResult.guardrails}
                    onSuccess={handleExportSuccess}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={handleOpenFilePicker}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploadResult ? "Upload Another Resume" : "Upload New Resume"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={handleJumpToAnalysis}
              disabled={!uploadResult}
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Jump to Analysis
            </Button>

            <p className="text-xs text-muted-foreground">
              The analysis shortcut unlocks after a resume has been uploaded. Tailoring
              and export unlock as you move through the workflow.
            </p>

            {step === "tailor" && analysis && (
              <TailorButton onClick={handleTailor} />
            )}

            {step === "export" && uploadResult && tailorResult && (
              <DownloadButton
                resumeId={uploadResult.id}
                tailoredText={tailorResult.tailored}
                analysis={analysis ?? undefined}
                guardrails={tailorResult.guardrails}
                compact
                onSuccess={handleExportSuccess}
              />
            )}

            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start"
              onClick={handleReset}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset Studio
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
