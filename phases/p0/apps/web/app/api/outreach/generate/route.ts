import { NextRequest } from "next/server";
import { getCloserBaseUrl, proxyJsonPost } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const params = new URLSearchParams();
  for (const [key, value] of request.nextUrl.searchParams) {
    params.set(key, value);
  }

  if (!params.has("application_id")) {
    try {
      const body = await request.json();
      if (body.applicationId) params.set("application_id", body.applicationId);
      if (body.recipientName) params.set("recipient_name", body.recipientName);
      if (body.recipientEmail) params.set("recipient_email", body.recipientEmail);
      if (body.templateType) params.set("template_type", body.templateType);
      if (body.job) params.set("job", JSON.stringify(body.job));
      if (body.application) params.set("application", JSON.stringify(body.application));
    } catch {
      // Ignore non-JSON bodies
    }
  }

  return proxyJsonPost(getCloserBaseUrl(), "/api/outreach/generate", params);
}
