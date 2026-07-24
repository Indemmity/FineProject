"use client";

import { useState } from "react";
import { Send, CheckCircle, XCircle, Clock, Search, Building2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";

interface QueueItem {
  id: string;
  companyName: string;
  jobTitle: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  status: "draft" | "queued" | "sent" | "failed";
  createdAt: string;
  errorMessage?: string;
}

interface SendQueueProps {
  items?: QueueItem[];
  onSend?: (id: string) => void;
  onDelete?: (id: string) => void;
  pageSize?: number;
}

const statusIcons = {
  draft: Clock,
  queued: Clock,
  sent: CheckCircle,
  failed: XCircle,
};

const statusColors: Record<string, string> = {
  draft: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30",
  queued: "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
  sent: "text-green-600 bg-green-50 dark:bg-green-950/30",
  failed: "text-red-600 bg-red-50 dark:bg-red-950/30",
};

export function SendQueue({
  items = [],
  onSend,
  onDelete,
  pageSize = 10,
}: SendQueueProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const hasActions = items.some((item) =>
    (item.status === "draft" && onSend) ||
    (item.status === "failed" && onSend) ||
    (item.status !== "sent" && onDelete)
  );

  const filtered = items.filter(
    (item) =>
      item.subject.toLowerCase().includes(search.toLowerCase()) ||
      item.recipientEmail.toLowerCase().includes(search.toLowerCase()) ||
      item.companyName.toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by company, email or subject..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          {search ? "No matching emails" : "No emails in queue"}
        </div>
      ) : (
        <div className="overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-secondary/50">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Company</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">To</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Subject</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                {hasActions && <th className="px-3 py-2 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paged.map((item) => (
                <tr key={item.id} className="border-b last:border-0 hover:bg-secondary/30">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{item.companyName || (item.jobTitle || "—")}</span>
                    </div>
                    {item.jobTitle && item.companyName && (
                      <div className="text-xs text-muted-foreground">{item.jobTitle}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    {item.recipientEmail || item.recipientName || "—"}
                  </td>
                  <td className="max-w-[180px] truncate px-3 py-2 text-sm">
                    {item.subject || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[item.status] || ""}`}
                    >
                      {item.status}
                    </span>
                    {item.errorMessage && (
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-red-500">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-[120px]">{item.errorMessage}</span>
                      </div>
                    )}
                  </td>
                  {hasActions && (
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(item.status === "draft" || item.status === "failed") && onSend && (
                          <button
                            onClick={() => onSend(item.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                          >
                            <Send className="h-3 w-3" />
                            {item.status === "failed" ? "Resend" : "Send"}
                          </button>
                        )}
                        {onDelete && item.status !== "sent" && (
                          <button
                            onClick={() => onDelete(item.id)}
                            className="rounded p-1 hover:bg-secondary"
                            title="Remove from queue"
                          >
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
