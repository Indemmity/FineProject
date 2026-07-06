"use client";

interface ScoreGaugeProps {
  score: number;
  size?: number;
}

export function ScoreGauge({ score, size = 120 }: ScoreGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const circumference = 2 * Math.PI * (size / 2 - 8);
  const offset = circumference - (clamped / 100) * circumference;

  const color =
    clamped < 40 ? "#ef4444" : clamped < 70 ? "#f59e0b" : "#22c55e";

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 8}
          fill="none"
          stroke="var(--color-secondary)"
          strokeWidth="6"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 8}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-2xl font-bold transition-colors"
          style={{ color }}
        >
          {clamped}
        </span>
      </div>
    </div>
  );
}