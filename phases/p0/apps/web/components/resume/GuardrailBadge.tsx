"use client";

import { useState } from "react";
import { CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface GuardrailIssue {
  type: "error" | "warning";
  field: string;
  message: string;
}

interface GuardrailBadgeProps {
  passed: boolean;
  issues: GuardrailIssue[];
  severity: "low" | "medium" | "high";
}

const icons = {
  passed: CheckCircle,
  warning: AlertTriangle,
  failed: XCircle,
};

const colors = {
  passed: "text-green-600 dark:text-green-400",
  warning: "text-yellow-600 dark:text-yellow-400",
  failed: "text-red-600 dark:text-red-400",
};

export function GuardrailBadge({ passed, issues, severity }: GuardrailBadgeProps) {
  const [expanded, setExpanded] = useState(false);
  const status = passed ? "passed" : "failed";
  const Icon = icons[status];

  return (
    <div className="rounded-lg border p-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${colors[status]}`} />
          <span className="font-medium">
            {passed ? "All guardrails passed" : `${issues.length} issue${issues.length !== 1 ? "s" : ""} found`}
          </span>
          <Badge
            variant={passed ? "default" : "destructive"}
            className="text-xs"
          >
            {severity}
          </Badge>
        </div>
        {issues.length > 0 && (
          expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {expanded && issues.length > 0 && (
        <div className="mt-2 space-y-2 border-t pt-2">
          {issues.map((issue, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              {issue.type === "error" ? (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
              )}
              <div>
                <span className="font-medium capitalize">{issue.field}:</span>{" "}
                <span className="text-muted-foreground">{issue.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}