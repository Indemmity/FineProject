"use client";

import { useRef, useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface DiffLine {
  type: "unchanged" | "added" | "removed" | "modified";
  originalLine: string;
  tailoredLine: string;
  lineNumber: number;
  reason?: string;
}

interface DiffViewerProps {
  diffs: DiffLine[];
}

const lineColors: Record<string, string> = {
  unchanged: "",
  added: "bg-green-50 dark:bg-green-950/30",
  removed: "bg-red-50 dark:bg-red-950/30",
  modified: "bg-yellow-50 dark:bg-yellow-950/30",
};

const linePrefix: Record<string, string> = {
  unchanged: " ",
  added: "+",
  removed: "-",
  modified: "~",
};

export function DiffViewer({ diffs }: DiffViewerProps) {
  const [view, setView] = useState<"side-by-side" | "unified">("unified");
  const scrollRef = useRef<HTMLDivElement>(null);

  const changes = diffs.filter((d) => d.type !== "unchanged");
  const unchanged = diffs.filter((d) => d.type === "unchanged");

  return (
    <div className="space-y-4">
      <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
        <TabsList>
          <TabsTrigger value="unified">Unified View</TabsTrigger>
          <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
        </TabsList>

        <TabsContent value="unified">
          <div
            ref={scrollRef}
            className="overflow-auto rounded-lg border text-sm font-mono"
          >
            {changes.length === 0 && (
              <div className="p-4 text-center text-muted-foreground">
                No changes made to the resume.
              </div>
            )}
            {changes.map((d, i) => (
              <div
                key={i}
                className={`flex ${lineColors[d.type]} px-4 py-0.5 hover:opacity-90`}
                title={d.reason}
              >
                <span className="w-8 shrink-0 text-right text-muted-foreground select-none">
                  {d.lineNumber}
                </span>
                <span className="w-5 shrink-0 font-bold select-none">
                  {linePrefix[d.type]}
                </span>
                <span className="whitespace-pre-wrap">
                  {d.type === "added"
                    ? d.tailoredLine
                    : d.type === "removed"
                      ? d.originalLine
                      : d.tailoredLine || d.originalLine}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="side-by-side">
          <div className="grid grid-cols-2 gap-0 overflow-auto rounded-lg border text-sm font-mono">
            <div>
              <div className="sticky top-0 bg-secondary px-4 py-1 font-semibold">
                Original
              </div>
              {diffs.slice(0, 50).map((d, i) => (
                <div
                  key={i}
                  className={`${lineColors[d.type]} px-4 py-0.5`}
                >
                  {d.originalLine || "\u00A0"}
                </div>
              ))}
            </div>
            <div>
              <div className="sticky top-0 bg-secondary px-4 py-1 font-semibold">
                Tailored
              </div>
              {diffs.slice(0, 50).map((d, i) => (
                <div
                  key={i}
                  className={`${lineColors[d.type]} px-4 py-0.5`}
                  title={d.reason}
                >
                  {d.tailoredLine || "\u00A0"}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {changes.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {changes.filter((d) => d.type === "modified").length} modified,{" "}
          {changes.filter((d) => d.type === "added").length} added,{" "}
          {changes.filter((d) => d.type === "removed").length} removed,{" "}
          {unchanged.length} unchanged
        </p>
      )}
    </div>
  );
}