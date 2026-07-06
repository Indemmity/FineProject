"use client";

interface VolumeGaugeProps {
  hourlyUsed: number;
  hourlyLimit: number;
  dailyUsed: number;
  dailyLimit: number;
}

export function VolumeGauge({
  hourlyUsed,
  hourlyLimit,
  dailyUsed,
  dailyLimit,
}: VolumeGaugeProps) {
  const hourlyPercent = (hourlyUsed / hourlyLimit) * 100;
  const dailyPercent = (dailyUsed / dailyLimit) * 100;

  const gaugeColor = (pct: number) => {
    if (pct >= 95) return "bg-red-500";
    if (pct >= 80) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h4 className="text-sm font-medium">Volume Caps</h4>

      <div>
        <div className="mb-1 flex justify-between text-xs">
          <span className="text-muted-foreground">Hourly</span>
          <span className={hourlyPercent >= 80 ? "font-semibold text-yellow-600" : ""}>
            {hourlyUsed} / {hourlyLimit}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full rounded-full transition-all ${gaugeColor(hourlyPercent)}`}
            style={{ width: `${Math.min(hourlyPercent, 100)}%` }}
          />
        </div>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs">
          <span className="text-muted-foreground">Daily</span>
          <span className={dailyPercent >= 80 ? "font-semibold text-yellow-600" : ""}>
            {dailyUsed} / {dailyLimit}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full rounded-full transition-all ${gaugeColor(dailyPercent)}`}
            style={{ width: `${Math.min(dailyPercent, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}