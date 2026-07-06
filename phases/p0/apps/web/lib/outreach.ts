export interface OutreachQueueItem {
  id: string;
  recipient: string;
  subject: string;
  status: "draft" | "queued" | "sent" | "failed";
  createdAt: string;
}

export interface OutreachDeliveryEntry {
  id: string;
  recipient: string;
  subject: string;
  sentAt: string;
  status: string;
  deliveryStatus: string;
}

export interface OutreachLogResponse {
  id: string;
  application_id: string;
  user_id: string;
  recipient_email: string;
  recipient_name: string;
  subject: string;
  subject_hash: string;
  status: string;
  delivery_status: string;
  error_message: string | null;
  sent_at: string;
  opened_at: string | null;
  replied_at: string | null;
}

export interface OutreachStatsResponse {
  total: number;
  sent: number;
  opened: number;
  replied: number;
  bounced: number;
  failed: number;
  open_rate: number;
  reply_rate: number;
  bounce_rate: number;
  hourly_remaining: number;
  daily_remaining: number;
}

interface OutreachLogsResponse {
  logs: OutreachLogResponse[];
  total: number;
}

export function toQueueItem(log: OutreachLogResponse): OutreachQueueItem {
  return {
    id: log.id,
    recipient: formatRecipient(log),
    subject: log.subject,
    status: mapQueueStatus(log),
    createdAt: log.sent_at,
  };
}

export function toDeliveryEntry(log: OutreachLogResponse): OutreachDeliveryEntry {
  return {
    id: log.id,
    recipient: formatRecipient(log),
    subject: log.subject,
    sentAt: log.sent_at,
    status: log.status,
    deliveryStatus: log.delivery_status || log.status,
  };
}

export async function getOutreachStats(): Promise<OutreachStatsResponse> {
  return fetchJson<OutreachStatsResponse>("/api/outreach/stats");
}

export async function getOutreachLogs(options?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<OutreachLogResponse[]> {
  const params = new URLSearchParams();
  if (options?.status) {
    params.set("status", options.status);
  }
  if (typeof options?.limit === "number") {
    params.set("limit", String(options.limit));
  }
  if (typeof options?.offset === "number") {
    params.set("offset", String(options.offset));
  }

  const query = params.toString();
  const data = await fetchJson<OutreachLogsResponse>(
    `/api/outreach/logs${query ? `?${query}` : ""}`,
  );
  return data.logs ?? [];
}

function mapQueueStatus(log: OutreachLogResponse): OutreachQueueItem["status"] {
  if (log.status === "draft") {
    return "draft";
  }
  if (log.status === "failed") {
    return "failed";
  }
  if (log.delivery_status === "pending") {
    return "queued";
  }
  return "sent";
}

function formatRecipient(log: OutreachLogResponse): string {
  if (log.recipient_name && log.recipient_email) {
    return `${log.recipient_name} <${log.recipient_email}>`;
  }
  return log.recipient_name || log.recipient_email || "Unknown recipient";
}

async function fetchJson<T>(input: RequestInfo | URL): Promise<T> {
  const response = await fetch(input, { cache: "no-store" });
  if (!response.ok) {
    let message = response.statusText || "Request failed";
    try {
      const payload = (await response.json()) as { error?: string; detail?: string };
      message = payload.error ?? payload.detail ?? message;
    } catch {
      // Ignore non-JSON error bodies.
    }
    throw new Error(message);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new Error("Unexpected response from server");
  }
}
