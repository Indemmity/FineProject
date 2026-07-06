"use client";

import { useState } from "react";
import { Download, Loader2, FileText, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GuardrailResult, MatchResult } from "@jobplatform/shared";

interface DownloadButtonProps {
  resumeId: string;
  disabled?: boolean;
  tailoredText?: string;
  analysis?: MatchResult;
  guardrails?: GuardrailResult;
  compact?: boolean;
  onSuccess?: () => void | Promise<void>;
}

export function DownloadButton({
  resumeId,
  disabled,
  tailoredText,
  analysis,
  guardrails,
  compact = false,
  onSuccess,
}: DownloadButtonProps) {
  const [isLoading, setIsLoading] = useState<"tailored" | "comparison" | null>(null);

  const download = async (type: "tailored" | "comparison") => {
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
        ? `Resume_Tailored_${resumeId.slice(0, 8)}.pdf`
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

  if (compact) {
    return (
      <Button
        variant="outline"
        onClick={() => download("tailored")}
        disabled={disabled || isLoading !== null}
        className="w-full justify-start"
      >
        {isLoading === "tailored" ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        Export Tailored PDF
      </Button>
    );
  }

  return (
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
        Tailored Resume (.pdf)
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
    </div>
  );
}
