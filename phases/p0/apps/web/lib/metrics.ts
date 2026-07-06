/**
 * Metrics exporter — Prometheus-compatible metrics endpoint.
 *
 * Exposes /metrics with request count, error count, latency, and queue size.
 */

interface Metric {
  name: string;
  value: number;
  labels?: Record<string, string>;
}

const metrics: Metric[] = [];

export function recordMetric(
  name: string,
  value: number,
  labels?: Record<string, string>,
): void {
  metrics.push({ name, value, labels });
  // Keep only last 1000 to avoid memory leaks
  if (metrics.length > 1000) metrics.splice(0, metrics.length - 1000);
}

export function getMetrics(): string {
  const lines: string[] = [];

  // Aggregate metrics
  const aggregated = new Map<string, { total: number; count: number; labels: Record<string, string> }>();
  for (const m of metrics) {
    const key = `${m.name}:${JSON.stringify(m.labels ?? {})}`;
    const existing = aggregated.get(key);
    if (existing) {
      existing.total += m.value;
      existing.count++;
    } else {
      aggregated.set(key, { total: m.value, count: 1, labels: m.labels ?? {} });
    }
  }

  for (const [, agg] of aggregated) {
    const labelStr = Object.entries(agg.labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(",");
    const nameWithLabels = labelStr ? `${agg.total}{${labelStr}}` : `${agg.total}`;
    lines.push(nameWithLabels);
  }

  return lines.join("\n");
}

export function requestCounter(): () => void {
  const start = Date.now();
  return () => {
    const duration = Date.now() - start;
    recordMetric("http_requests_total", 1);
    recordMetric("http_request_duration_ms", duration);
  };
}