"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, AlertTriangle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface GapItem {
  skill: string;
  importance: "high" | "medium" | "low";
  category: string;
  suggestedAction: string;
}

interface GapListProps {
  gaps: GapItem[];
}

const importanceColors: Record<string, string> = {
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

export function GapList({ gaps }: GapListProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  if (!gaps.length) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <Info className="h-4 w-4" />
        No gaps identified — your resume matches the job well!
      </div>
    );
  }

  const toggle = (idx: number) => {
    const next = new Set(expanded);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setExpanded(next);
  };

  return (
    <div className="space-y-2">
      {gaps.map((gap, idx) => (
        <Card
          key={idx}
          className="cursor-pointer p-3 transition-colors hover:bg-secondary/50"
          onClick={() => toggle(idx)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {expanded.has(idx) ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="font-medium">{gap.skill}</span>
              <Badge className={importanceColors[gap.importance] ?? ""}>
                {gap.importance}
              </Badge>
              <Badge variant="outline">{gap.category}</Badge>
            </div>
          </div>

          {expanded.has(idx) && (
            <div className="mt-2 pl-6 text-sm text-muted-foreground">
              {gap.suggestedAction && (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>{gap.suggestedAction}</span>
                </div>
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}