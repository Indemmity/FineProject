import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email-sender";
import { outreachLogs } from "@/app/api/outreach/generate/route";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Find the log entry
  const log = outreachLogs.find((l) => l.id === id);
  if (!log) {
    return NextResponse.json({ error: "Outreach log not found" }, { status: 404 });
  }

  // Send the email
  const result = await sendEmail({
    toEmail: (log.recipient_email as string) || "",
    toName: (log.recipient_name as string) || "Hiring Manager",
    subject: (log.subject as string) || "Opportunity",
    bodyHtml: (log.body_html as string) || "",
    bodyText: (log.body_text as string) || "",
  });

  // Update log
  if (result.success) {
    log.status = "sent";
    log.delivery_status = "delivered";
    log.sent_at = new Date().toISOString();
    return NextResponse.json({ status: "sent", messageId: result.messageId, logId: id, sentAt: log.sent_at });
  } else {
    log.status = "failed";
    log.error_message = result.error || "Unknown error";
    return NextResponse.json({ status: "failed", error: result.error });
  }
}
