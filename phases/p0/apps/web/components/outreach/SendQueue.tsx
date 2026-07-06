"use client";

import { useState } from "react";
import { Send, CheckCircle, XCircle, Clock, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface QueueItem {
  id: string;
  recipient: string;
  subject: string;
  status: "draft" | "queued" | "sent" | "failed";
  createdAt: string;
}

interface SendQueueProps {
  items?: QueueItem[];
  onSend?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const statusIcons = {
  draft: Clock,
  queued: Clock,
  sent: CheckCircle,
  failed: XCircle,
};

const statusColors = {
  draft: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30",
  queued: "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
  sent: "text-green-600 bg-green-50 dark:bg-green-950/30",
  failed: "text-red-600 bg-red-50 dark:bg-red-950/30",
};

export function SendQueue({
  items = [],
  onSend,
  onDelete,
}: SendQueueProps) {
  const [search, setSearch] = useState("");

  const filtered = items.filter(
    (item) =>
      item.subject.toLowerCase().includes(search.toLowerCase()) ||
      item.recipient.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by recipient or subject..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {search ? "No matching emails" : "No emails in queue"}
          </div>
        )}
        {filtered.map((item) => {
          const Icon = statusIcons[item.status];
          return (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{item.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    To: {item.recipient}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[item.status]}`}
                >
                  {item.status}
                </span>
                {item.status === "draft" && onSend && (
                  <button
                    onClick={() => onSend(item.id)}
                    className="rounded p-1 hover:bg-secondary"
                    title="Send"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(item.id)}
                    className="rounded p-1 hover:bg-secondary"
                    title="Remove"
                  >
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}