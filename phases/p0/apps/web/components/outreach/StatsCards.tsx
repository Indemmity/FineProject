"use client";

import { Card } from "@/components/ui/card";

interface StatsCardsProps {
  stats: {
    total: number;
    sent: number;
    opened: number;
    replied: number;
    bounced: number;
    openRate: number;
    replyRate: number;
    bounceRate: number;
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    { label: "Total Sent", value: stats.sent, suffix: "" },
    { label: "Open Rate", value: stats.openRate, suffix: "%", color: "text-green-600" },
    { label: "Reply Rate", value: stats.replyRate, suffix: "%", color: "text-blue-600" },
    { label: "Bounce Rate", value: stats.bounceRate, suffix: "%", color: stats.bounceRate > 5 ? "text-red-600" : "text-green-600" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="p-4">
          <p className="text-sm text-muted-foreground">{card.label}</p>
          <p className={`text-2xl font-bold ${card.color ?? ""}`}>
            {card.value}
            {card.suffix}
          </p>
        </Card>
      ))}
    </div>
  );
}