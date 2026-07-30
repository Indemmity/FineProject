import { NextRequest, NextResponse } from "next/server";
import { generateOutreachEmail } from "@/lib/email-generator";

export const dynamic = "force-dynamic";

// In-memory log store (resets on cold start)
const outreachLogs: Array<Record<string, unknown>> = [];

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const params = new URLSearchParams(request.nextUrl.search);
    let body: Record<string, unknown> = {};
    try { body = await request.json(); } catch {}

    const applicationId = (body.applicationId as string) || params.get("application_id") || crypto.randomUUID();
    const recipientEmail = (body.recipientEmail as string) || params.get("recipient_email") || "";
    const recipientName = (body.recipientName as string) || params.get("recipient_name") || "Hiring Manager";
    const companyName = (body.company_name as string) || params.get("company_name") || "";
    const jobTitle = (body.job_title as string) || params.get("job_title") || "";
    let jobData: Record<string, unknown> = {};
    if (body.job) jobData = body.job as Record<string, unknown>;
    else if (params.get("job")) {
      try { jobData = JSON.parse(params.get("job")!); } catch {}
    }

    const email = generateOutreachEmail({
      job: jobData as any,
      recipientEmail,
      recipientName,
    });

    const logId = crypto.randomUUID();
    outreachLogs.push({
      id: logId,
      application_id: applicationId,
      user_id: "demo-user",
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      company_name: companyName || (jobData.company as string) || "",
      job_title: jobTitle || (jobData.title as string) || "",
      subject: email.subject,
      body_html: email.body_html,
      body_text: email.body_text,
      status: "draft",
      delivery_status: "pending",
      error_message: null,
      sent_at: new Date().toISOString(),
    });

    return NextResponse.json({
      draft: {
        id: logId,
        subject: email.subject,
        body_html: email.body_html,
        body_text: email.body_text,
      },
      applicationId,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// Exported for stats/logs routes
export { outreachLogs };
