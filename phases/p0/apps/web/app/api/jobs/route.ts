import { NextRequest, NextResponse } from "next/server";
import { getHarvesterBaseUrl, proxyJsonRequest } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Return empty list on Vercel since backend services aren't deployed
  if (process.env.VERCEL) {
    return NextResponse.json({ jobs: [] });
  }
  return proxyJsonRequest(getHarvesterBaseUrl(), "/api/jobs", request.nextUrl);
}
