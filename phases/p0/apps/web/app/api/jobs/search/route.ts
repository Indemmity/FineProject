import { NextRequest, NextResponse } from "next/server";
import { getHarvesterBaseUrl, proxyJsonRequest } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (process.env.VERCEL) {
    return NextResponse.json({ search_id: "vercel", status: "completed", progress: 100, results: [] });
  }
  return proxyJsonRequest(getHarvesterBaseUrl(), "/api/jobs/search", request.nextUrl);
}
