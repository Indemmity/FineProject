import { NextRequest, NextResponse } from "next/server";
import { outreachLogs } from "@/app/api/outreach/generate/route";

export const dynamic = "force-dynamic";

export async function GET() {
  const total = outreachLogs.length;
  const sent = outreachLogs.filter((l) => l.status === "sent").length;
  const opened = outreachLogs.filter((l) => l.delivery_status === "opened").length;
  const replied = outreachLogs.filter((l) => l.delivery_status === "replied").length;
  const bounced = outreachLogs.filter((l) => l.delivery_status === "bounced").length;
  const failed = outreachLogs.filter((l) => l.status === "failed").length;

  return NextResponse.json({
    total, sent, opened, replied, bounced, failed,
    open_rate: total > 0 ? Math.round((opened / total) * 100) : 0,
    reply_rate: total > 0 ? Math.round((replied / total) * 100) : 0,
    bounce_rate: total > 0 ? Math.round((bounced / total) * 100) : 0,
    hourly_remaining: 20,
    daily_remaining: 100,
  });
}
