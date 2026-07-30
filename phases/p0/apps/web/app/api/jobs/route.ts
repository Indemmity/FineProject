import { NextRequest, NextResponse } from "next/server";
import { getHarvesterBaseUrl, proxyJsonRequest } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return proxyJsonRequest(getHarvesterBaseUrl(), "/api/jobs", request.nextUrl);
}
