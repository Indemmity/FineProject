import { NextRequest } from "next/server";
import { getCloserBaseUrl, proxyJsonPost } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const path = `/api/outreach/${id}/cancel`;
  return proxyJsonPost(getCloserBaseUrl(), path, new URLSearchParams());
}
