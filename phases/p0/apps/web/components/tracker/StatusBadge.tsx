"use client";

import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
}

const STATUS_VARIANTS: Record<string, string> = {
  discovered: "bg-slate-100 text-slate-700",
  analyzed: "bg-blue-100 text-blue-700",
  tailored: "bg-purple-100 text-purple-700",
  outreach_sent: "bg-yellow-100 text-yellow-700",
  applied: "bg-orange-100 text-orange-700",
  interview: "bg-green-100 text-green-700",
  offer: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  closed: "bg-gray-100 text-gray-700",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const colorClass = STATUS_VARIANTS[status] ?? "bg-gray-100 text-gray-700";
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}