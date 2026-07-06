"use client";

import { ArrowUpDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface DeliveryLogEntry {
  id: string;
  recipient: string;
  subject: string;
  sentAt: string;
  status: string;
  deliveryStatus: string;
}

interface DeliveryLogProps {
  entries?: DeliveryLogEntry[];
  onResend?: (id: string) => void;
  onViewDetails?: (id: string) => void;
}

export function DeliveryLog({
  entries = [],
  onResend,
}: DeliveryLogProps) {
  const columns = [
    { key: "recipient", label: "Recipient" },
    { key: "subject", label: "Subject" },
    { key: "sentAt", label: "Sent" },
    { key: "status", label: "Status" },
  ];

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Filter logs..." className="pl-9" />
      </div>

      {entries.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No delivery logs yet
        </div>
      ) : (
        <div className="overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-secondary/50">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-3 py-2 text-left font-medium text-muted-foreground"
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                ))}
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b last:border-0 hover:bg-secondary/30">
                  <td className="px-3 py-2">{entry.recipient}</td>
                  <td className="max-w-[200px] truncate px-3 py-2">
                    {entry.subject}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {entry.sentAt
                      ? new Date(entry.sentAt).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        entry.deliveryStatus === "delivered"
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          : entry.deliveryStatus === "bounced" ||
                              entry.deliveryStatus === "failed"
                            ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                      }`}
                    >
                      {entry.deliveryStatus || entry.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {onResend && entry.deliveryStatus === "failed" && (
                      <button
                        onClick={() => onResend(entry.id)}
                        className="text-xs text-primary hover:underline"
                      >
                        Resend
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}