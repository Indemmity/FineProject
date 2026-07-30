import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const smtpUser = process.env.SMTP_USER || "";
  const smtpPass = process.env.SMTP_PASSWORD || "";
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
  const senderName = process.env.SENDER_NAME || "";

  const status = {
    smtp: {
      host: smtpHost,
      port: smtpPort,
      user_configured: !!smtpUser,
      user_value: smtpUser ? smtpUser.substring(0, 3) + "..." : "NOT SET",
      pass_configured: !!smtpPass,
      pass_length: smtpPass.length,
      sender_name: senderName || "NOT SET",
    },
    env_count: Object.keys(process.env).filter(k => k.startsWith('SMTP') || k.startsWith('SENDER')).join(', '),
    all_env_keys: Object.keys(process.env).filter(k => /smtp|email|mail|sender/i.test(k)),
  };

  return NextResponse.json(status, {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
