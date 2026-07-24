import { NextRequest } from "next/server";
import { getCloserBaseUrl, proxyJsonPost } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const path = `/api/outreach/${id}/send`;
  const searchParams = new URLSearchParams();
  try {
    const body = (await request.json()) as Record<string, string>;
    for (const key of ["to_email", "to_name", "subject", "body_html", "body_text", "user_id", "application_id"]) {
      if (body[key]) searchParams.set(key, body[key]);
    }
  } catch {
    // No JSON body — proceed with empty params (P3 will look up from log)
  }
  return proxyJsonPost(getCloserBaseUrl(), path, searchParams);
}
