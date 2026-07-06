"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeliveryLog } from "@/components/outreach/DeliveryLog";
import { SendQueue } from "@/components/outreach/SendQueue";
import {
  getOutreachLogs,
  getOutreachStats,
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

  const loadOutreachData = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);

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
        </div>
        <Button variant="outline" onClick={() => void loadOutreachData()} disabled={isRefreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

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
          <CardHeader>
            <CardTitle className="text-lg">Send Queue</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && queueItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Loading outreach queue...
              </p>
            ) : (
              <SendQueue items={queueItems} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Delivery Log</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && deliveryEntries.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Loading delivery log...
              </p>
            ) : (
              <DeliveryLog entries={deliveryEntries} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
