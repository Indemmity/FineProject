import { NextRequest } from "next/server";
import { getCloserBaseUrl, proxyJsonPost } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const path = `/api/outreach/${id}/track`;
  return proxyJsonPost(getCloserBaseUrl(), path, request.nextUrl.searchParams);
}
