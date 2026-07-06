import { NextRequest } from "next/server";
import { getCloserBaseUrl, proxyJsonRequest } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return proxyJsonRequest(getCloserBaseUrl(), "/api/outreach/stats", request.nextUrl);
}
