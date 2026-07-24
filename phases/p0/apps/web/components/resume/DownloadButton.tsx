"use client";

import { useState } from "react";
import { Download, Loader2, FileText, FileSpreadsheet, Layout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeSelector } from "./ThemeSelector";
import type { GuardrailResult, MatchResult } from "@jobplatform/shared";
import type { ResumeData } from "@jobplatform/shared/lib/resume/extractor";

interface DownloadButtonProps {
  resumeId: string;
  disabled?: boolean;
  tailoredText?: string;
  analysis?: MatchResult;
  guardrails?: GuardrailResult;
  resumeData?: ResumeData;
  compact?: boolean;
  onSuccess?: () => void | Promise<void>;
  onOpenVisualBuilder?: () => void;
}

export function DownloadButton({
  resumeId,
  disabled,
  tailoredText,
  analysis,
  guardrails,
  resumeData,
  compact = false,
  onSuccess,
  onOpenVisualBuilder,
}: DownloadButtonProps) {
  const [isLoading, setIsLoading] = useState<"tailored" | "comparison" | "theme" | "openresume" | null>(null);

  const download = async (type: "tailored" | "comparison", theme?: string) => {
    setIsLoading(type);
    try {
      const payload: Record<string, unknown> = { type };
      if (tailoredText) {
        payload.tailoredText = tailoredText;
      }
      if (type === "comparison") {
        if (analysis) {
          payload.analysis = analysis;
        }
        if (guardrails) {
          payload.guardrails = guardrails;
        }
      }
      if (theme) {
        payload.theme = theme;
      }

      const res = await fetch(`/api/resume/${resumeId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = type === "tailored"
        ? `Resume_Tailored_${theme || 'professional'}_${resumeId.slice(0, 8)}.pdf`
        : `Resume_Comparison_${resumeId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (onSuccess) {
        await onSuccess();
      }
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setIsLoading(null);
    }
  };

  const downloadOpenResume = async () => {
    setIsLoading("openresume");
    try {
      const payload: Record<string, unknown> = {
        tailoredText,
        resumeData: resumeData || {
          name: "Your Name",
          email: "your.email@example.com",
          phone: "Your Phone",
          location: "Your Location",
          summary: tailoredText?.substring(0, 500),
          experience: [],
          education: [],
          skills: [],
        },
      };

      const res = await fetch(`/api/resume/${resumeId}/export/openresume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("OpenResume download failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Resume_OpenResume_${resumeId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (onSuccess) {
        await onSuccess();
      }
    } catch (err) {
      console.error("OpenResume download failed:", err);
    } finally {
      setIsLoading(null);
    }
  };

  const handleThemeExport = async (theme: string) => {
    await download("tailored", theme);
  };

  if (compact) {
    console.log('DownloadButton rendering in compact mode, onOpenVisualBuilder:', !!onOpenVisualBuilder);
    return (
      <div className="flex flex-col gap-2">
        <ThemeSelector
          resumeId={resumeId}
          tailoredText={tailoredText}
          onExport={handleThemeExport}
          isExporting={isLoading === "theme"}
        />
        <Button
          variant="default"
          onClick={() => {
            console.log('Compact Visual Builder button clicked');
            if (onOpenVisualBuilder) {
              onOpenVisualBuilder();
            } else {
              console.error('onOpenVisualBuilder callback is missing');
            }
          }}
          disabled={disabled || isLoading !== null}
          className="bg-primary text-primary-foreground"
        >
          <Layout className="mr-2 h-4 w-4" />
          Visual Builder
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ThemeSelector
        resumeId={resumeId}
        tailoredText={tailoredText}
        onExport={handleThemeExport}
        isExporting={isLoading === "theme"}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          variant="outline"
          onClick={() => download("tailored")}
          disabled={disabled || isLoading !== null}
        >
          {isLoading === "tailored" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileText className="mr-2 h-4 w-4" />
          )}
          Professional Default (.pdf)
        </Button>
        <Button
          variant="outline"
          onClick={() => download("comparison")}
          disabled={disabled || isLoading !== null}
        >
          {isLoading === "comparison" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="mr-2 h-4 w-4" />
          )}
          Comparison Report (.pdf)
        </Button>
        <Button
          variant="outline"
          onClick={downloadOpenResume}
          disabled={disabled || isLoading !== null}
          className="border-primary text-primary hover:bg-primary/10"
        >
          {isLoading === "openresume" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Layout className="mr-2 h-4 w-4" />
          )}
          OpenResume Template (.pdf)
        </Button>
        <Button
          variant="default"
          onClick={() => {
            console.log('Full Visual Builder button clicked');
            if (onOpenVisualBuilder) {
              onOpenVisualBuilder();
            } else {
              console.error('onOpenVisualBuilder callback is missing');
            }
          }}
          disabled={disabled || isLoading !== null}
          className="bg-primary text-primary-foreground"
        >
          <Layout className="mr-2 h-4 w-4" />
          Visual Builder
        </Button>
      </div>
      <div className="text-xs text-muted-foreground">
        <p className="font-medium text-primary">OpenResume Template:</p>
        <p>Free, open-source ATS-friendly resume format optimized for applicant tracking systems. Clean single-column design with professional styling.</p>
      </div>
    </div>
  );
}
