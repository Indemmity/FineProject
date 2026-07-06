"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MetricCardsProps {
  stats: {
    total: number;
    interviewed: number;
    offered: number;
    responseRate: number;
    avgScore: number | null;
  };
}

export function MetricCards({ stats }: MetricCardsProps) {
  const cards = [
    { label: "Total Applications", value: stats.total.toString() },
    { label: "Interviews", value: stats.interviewed.toString() },
    { label: "Offers", value: stats.offered.toString() },
    {
      label: "Response Rate",
      value: `${stats.responseRate}%`,
      color: stats.responseRate > 50 ? "text-green-600" : undefined,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${card.color ?? ""}`}>
              {card.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}