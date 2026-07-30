import { NextRequest, NextResponse } from "next/server";
import { getCloserBaseUrl, proxyJsonRequest } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (process.env.VERCEL) {
    return NextResponse.json({ logs: [], total: 0 });
  }
  return proxyJsonRequest(getCloserBaseUrl(), "/api/outreach/logs", request.nextUrl);
}
