"use client";

import { useState } from "react";
import { ArrowUpDown, Search, Send, Building2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";

interface DeliveryLogEntry {
  id: string;
  companyName: string;
  jobTitle: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  sentAt: string;
  status: string;
  deliveryStatus: string;
  errorMessage?: string;
}

interface DeliveryLogProps {
  entries?: DeliveryLogEntry[];
  onSend?: (id: string) => void;
  onResend?: (id: string) => void;
  pageSize?: number;
}

export function DeliveryLog({
  entries = [],
  onSend,
  onResend,
  pageSize = 15,
}: DeliveryLogProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = entries.filter(
    (entry) =>
      entry.companyName.toLowerCase().includes(search.toLowerCase()) ||
      entry.subject.toLowerCase().includes(search.toLowerCase()) ||
      entry.recipientEmail.toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Filter by company, recipient or subject..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No delivery logs yet
        </div>
      ) : (
        <div className="overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-secondary/50">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Company</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">To</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Subject</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Sent</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((entry) => (
                <tr key={entry.id} className="border-b last:border-0 hover:bg-secondary/30">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{entry.companyName || (entry.jobTitle || "—")}</span>
                    </div>
                    {entry.jobTitle && entry.companyName && (
                      <div className="text-xs text-muted-foreground">{entry.jobTitle}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    {entry.recipientEmail || entry.recipientName || "—"}
                  </td>
                  <td className="max-w-[180px] truncate px-3 py-2 text-sm">
                    {entry.subject || "—"}
                    {entry.jobTitle && !entry.companyName && (
                      <div className="text-xs text-muted-foreground">{entry.jobTitle}</div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                    {entry.sentAt
                      ? new Date(entry.sentAt).toLocaleString()
                      : "-"}
                  </td>
                  <td className="px-3 py-2">
                    {(() => {
                      const isOpened = entry.deliveryStatus === "opened" || entry.status === "opened";
                      const isSent = entry.status === "sent" || entry.deliveryStatus === "delivered";
                      const isFailed = entry.status === "failed" || entry.deliveryStatus === "failed" || entry.deliveryStatus === "bounced";
                      const isDraft = entry.status === "draft";
                      let label = entry.deliveryStatus || entry.status;
                      if (isOpened) label = "Opened";
                      else if (isSent) label = "Sent";
                      else if (isDraft) label = "Draft";
                      else if (isFailed) label = "Failed";
                      const color = isOpened
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : isSent
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                          : isFailed
                            ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
                      return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{label}</span>;
                    })()}
                    {entry.errorMessage && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-red-500">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span>{entry.errorMessage}</span>
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {(entry.status === "draft" || entry.status === "failed") && onSend && (
                        <button
                          onClick={() => onSend(entry.id)}
                          className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          <Send className="h-3 w-3" />
                          {entry.status === "failed" ? "Resend" : "Send"}
                        </button>
                      )}
                      {entry.status === "failed" && onResend && !onSend && (
                        <button
                          onClick={() => onResend(entry.id)}
                          className="text-xs text-primary hover:underline"
                        >
                          Resend
                        </button>
                      )}
                    </div>
                  </td>
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
