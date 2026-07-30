"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeliveryLog } from "@/components/outreach/DeliveryLog";
import { SendQueue } from "@/components/outreach/SendQueue";
import { SendDialog } from "@/components/outreach/SendDialog";
import {
  cancelOutreach,
  getOutreachLogs,
  getOutreachStats,
  sendOutreach,
  toDeliveryEntry,
  toQueueItem,
  type OutreachLogResponse,
  type OutreachStatsResponse,
} from "@/lib/outreach";

export default function OutreachConsolePage() {
  const [stats, setStats] = useState<OutreachStatsResponse | null>(null);
  const [logs, setLogs] = useState<OutreachLogResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [draftToSend, setDraftToSend] = useState<OutreachLogResponse | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [smtpStatus, setSmtpStatus] = useState<{ connected: boolean; message: string } | null>(null);

  useEffect(() => {
    fetch('/api/debug/smtp')
      .then(r => r.json())
      .then(d => {
        const connected = d.smtp?.user_configured && d.smtp?.pass_configured;
        setSmtpStatus({
          connected: !!connected,
          message: connected
            ? `SMTP: ${d.smtp?.user_value}@${d.smtp?.host}`
            : `SMTP not configured (keys: ${d.env_count || 'none'})`,
        });
      })
      .catch(() => setSmtpStatus({ connected: false, message: 'SMTP status check failed' }));
  }, []);

  const loadOutreachData = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    setSuccess(null);

    try {
      const [nextStats, nextLogs] = await Promise.all([
        getOutreachStats(),
        getOutreachLogs({ limit: 100 }),
      ]);
      setStats(nextStats);
      setLogs(nextLogs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load outreach data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadOutreachData();
  }, [loadOutreachData]);

  const queueItems = useMemo(
    () =>
      logs
        .map(toQueueItem)
        .filter((item) => item.status === "draft" || item.status === "queued" || item.status === "failed"),
    [logs],
  );

  const sentItems = useMemo(
    () =>
      logs
        .map(toQueueItem)
        .filter((item) => item.status === "sent"),
    [logs],
  );

  const handleSend = useCallback((id: string) => {
    const log = logs.find((l) => l.id === id);
    if (log) {
      setDraftToSend(log);
      setSendDialogOpen(true);
    }
  }, [logs]);

  const handleConfirmSend = useCallback(async (data: { toEmail: string; toName: string; subject: string }) => {
    if (!draftToSend) return;
    const result = await sendOutreach(draftToSend.id, {
      toEmail: data.toEmail,
      toName: data.toName,
      subject: data.subject,
    });
    await loadOutreachData();
    setSuccess(`Email sent to ${data.toEmail} at ${new Date(result.sentAt || Date.now()).toLocaleTimeString()}`);
  }, [draftToSend, loadOutreachData]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await cancelOutreach(id);
      setLogs((prev) => prev.filter((l) => l.id !== id));
      setSuccess("Draft cancelled");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel draft");
    }
  }, []);

  const deliveryEntries = useMemo(() => logs.map(toDeliveryEntry), [logs]);

  const metrics = [
    { label: "Total Sent", value: stats ? String(stats.sent) : "0" },
    { label: "Open Rate", value: stats ? `${stats.open_rate}%` : "0%" },
    { label: "Reply Rate", value: stats ? `${stats.reply_rate}%` : "0%" },
    { label: "Bounce Rate", value: stats ? `${stats.bounce_rate}%` : "0%" },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Outreach Console</h1>
          <p className="text-muted-foreground">
            Generate, preview, send, and track cold emails.
          </p>
          {smtpStatus && (
            <div className={`mt-2 text-xs px-2 py-1 rounded inline-block ${
              smtpStatus.connected 
                ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
            }`}>
              {smtpStatus.connected ? '🟢' : '🔴'} {smtpStatus.message}
            </div>
          )}
        </div>
        <Button variant="outline" onClick={() => void loadOutreachData()} disabled={isRefreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-400">{success}</div>
      )}
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Queue Capacity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>Hourly remaining: {stats?.hourly_remaining ?? 0}</p>
            <p>Daily remaining: {stats?.daily_remaining ?? 0}</p>
            <p>Total logs: {stats?.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Delivery Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>Sent: {stats?.sent ?? 0}</p>
            <p>Opened: {stats?.opened ?? 0}</p>
            <p>Replied: {stats?.replied ?? 0}</p>
            <p>Failed: {stats?.failed ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Send Queue</CardTitle>
            <p className="text-xs text-muted-foreground">
              {queueItems.length} item{queueItems.length !== 1 ? "s" : ""} pending
            </p>
          </CardHeader>
          <CardContent>
            {isLoading && queueItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Loading outreach queue...
              </p>
            ) : (
              <SendQueue items={queueItems} onSend={handleSend} onDelete={handleDelete} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Sent Mail</CardTitle>
            <p className="text-xs text-muted-foreground">
              {sentItems.length} email{sentItems.length !== 1 ? "s" : ""} sent
            </p>
          </CardHeader>
          <CardContent>
            {isLoading && sentItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Loading sent mail...
              </p>
            ) : (
              <SendQueue items={sentItems} />
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Delivery Log</CardTitle>
            <p className="text-xs text-muted-foreground">
              {deliveryEntries.length} total log{deliveryEntries.length !== 1 ? "s" : ""}
            </p>
          </CardHeader>
          <CardContent>
            {isLoading && deliveryEntries.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Loading delivery log...
              </p>
            ) : (
              <DeliveryLog entries={deliveryEntries} onSend={handleSend} />
            )}
          </CardContent>
        </Card>
      </div>

      {draftToSend && (
        <SendDialog
          open={sendDialogOpen}
          onOpenChange={(open) => {
            setSendDialogOpen(open);
            if (!open) setDraftToSend(null);
          }}
          recipientEmail={draftToSend.recipient_email}
          recipientName={draftToSend.recipient_name}
          subject={draftToSend.subject}
          bodyHtml={draftToSend.body_html}
          bodyText={draftToSend.body_text}
          onConfirm={handleConfirmSend}
        />
      )}
    </div>
  );
}
