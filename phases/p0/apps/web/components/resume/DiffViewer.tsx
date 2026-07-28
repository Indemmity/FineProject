"use client";

import { useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

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

interface TailorStats {
  bulletPointsRewritten?: number;
  keywordsAdded?: number;
  buzzwordsRemoved?: number;
  bulletPointsTotal?: number;
}

const lineColors: Record<string, string> = {
  unchanged: "",
  added: "bg-green-50 dark:bg-green-950/30 border-l-2 border-green-400 dark:border-green-600",
  removed: "bg-red-50 dark:bg-red-950/30 border-l-2 border-red-400 dark:border-red-600",
  modified: "bg-yellow-50 dark:bg-yellow-950/30 border-l-2 border-yellow-400 dark:border-yellow-600",
};

const lineBadge: Record<string, { bg: string; label: string }> = {
  added: { bg: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300", label: "Added" },
  removed: { bg: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", label: "Removed" },
  modified: { bg: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300", label: "Modified" },
  unchanged: { bg: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", label: "Same" },
};

export function DiffViewer({ diffs }: DiffViewerProps) {
  const [view, setView] = useState<"side-by-side" | "unified">("side-by-side");
  const [showUnchanged, setShowUnchanged] = useState(false);

  const filtered = showUnchanged ? diffs : diffs.filter((d) => d.type !== "unchanged");
  const addedCount = diffs.filter((d) => d.type === "added").length;
  const removedCount = diffs.filter((d) => d.type === "removed").length;
  const modifiedCount = diffs.filter((d) => d.type === "modified").length;
  const unchangedCount = diffs.filter((d) => d.type === "unchanged").length;

  return (
    <div className="space-y-3">
      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 px-2 py-1 rounded-full font-medium">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          {addedCount} Added
        </div>
        <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-2 py-1 rounded-full font-medium">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          {removedCount} Removed
        </div>
        <div className="flex items-center gap-1.5 bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300 px-2 py-1 rounded-full font-medium">
          <span className="w-2 h-2 rounded-full bg-yellow-500" />
          {modifiedCount} Modified
        </div>
        <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-full font-medium">
          <span className="w-2 h-2 rounded-full bg-gray-400" />
          {unchangedCount} Unchanged
        </div>
      </div>

      {/* View toggle */}
      <div className="flex items-center justify-between">
        <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
          <TabsList>
            <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
            <TabsTrigger value="unified">Unified View</TabsTrigger>
          </TabsList>
        </Tabs>
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showUnchanged}
            onChange={(e) => setShowUnchanged(e.target.checked)}
            className="h-3 w-3"
          />
          Show unchanged
        </label>
      </div>

      {/* Side by Side */}
      {view === "side-by-side" && (
        <div className="rounded-lg border overflow-hidden">
          <div className="grid grid-cols-2 divide-x">
            <div className="bg-muted/30 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Original Resume
            </div>
            <div className="bg-muted/30 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Tailored Resume
            </div>
          </div>
          <ScrollArea className="max-h-[500px]">
            <div className="grid grid-cols-2 divide-x text-sm font-mono">
              <div>
                {filtered.map((d, i) => (
                  <div key={i} className={`px-3 py-2 ${lineColors[d.type]}`}>
                    <span className="text-muted-foreground select-none text-xs mr-2">
                      {d.lineNumber}
                    </span>
                    {d.originalLine || "\u00A0"}
                  </div>
                ))}
              </div>
              <div>
                {filtered.map((d, i) => (
                  <div
                    key={i}
                    className={`px-3 py-2 ${lineColors[d.type]} relative group`}
                    title={d.reason}
                  >
                    <span className={`text-xs mr-2 px-1 py-0.5 rounded ${lineBadge[d.type].bg}`}>
                      {lineBadge[d.type].label}
                    </span>
                    {d.tailoredLine || "\u00A0"}
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Unified */}
      {view === "unified" && (
        <div className="rounded-lg border overflow-hidden">
          <ScrollArea className="max-h-[500px]">
            <div className="text-sm font-mono">
              {filtered.map((d, i) => (
                <div
                  key={i}
                  className={`flex gap-3 px-3 py-2 ${lineColors[d.type]} group`}
                  title={d.reason}
                >
                  <span className="text-muted-foreground select-none text-xs shrink-0 w-8 text-right">
                    {d.lineNumber}
                  </span>
                  <span className={`text-xs shrink-0 px-1 py-0.5 rounded ${lineBadge[d.type].bg}`}>
                    {lineBadge[d.type].label}
                  </span>
                  <div className="space-y-1 flex-1">
                    {d.type !== "added" && (
                      <div className="text-red-600 dark:text-red-400 line-through">
                        {d.originalLine}
                      </div>
                    )}
                    {d.type !== "removed" && (
                      <div className="text-green-700 dark:text-green-300">
                        {d.tailoredLine}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
