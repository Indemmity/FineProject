import { NextRequest, NextResponse } from "next/server";
import { outreachLogs } from "@/app/api/outreach/generate/route";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const limit = parseInt(url.searchParams.get("limit") || "50", 10);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);

  let filtered = outreachLogs;
  if (status) {
    filtered = filtered.filter((l) => l.status === status);
  }

  const paginated = filtered.slice(offset, offset + limit);
  return NextResponse.json({ logs: paginated, total: filtered.length });
}
