import { NextRequest, NextResponse } from "next/server";
import { getCloserBaseUrl, proxyJsonRequest } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (process.env.VERCEL) {
    return NextResponse.json({ total: 0, sent: 0, opened: 0, replied: 0, bounced: 0, failed: 0 });
  }
  return proxyJsonRequest(getCloserBaseUrl(), "/api/outreach/stats", request.nextUrl);
}
