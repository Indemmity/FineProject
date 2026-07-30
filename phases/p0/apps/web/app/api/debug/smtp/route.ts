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
      pass_configured: !!smtpPass,
      sender_name: senderName || "NOT SET",
    },
    vercel_env: !!process.env.VERCEL,
    node_env: process.env.NODE_ENV || "unknown",
  };

  // Try actual SMTP connection
  if (smtpUser && smtpPass) {
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.default.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: false,
        auth: { user: smtpUser, pass: smtpPass },
        connectionTimeout: 5000,
      });
      await transporter.verify();
      (status as any).smtp_connected = true;
      (status as any).smtp_message = "✅ SMTP connected successfully";
    } catch (e: any) {
      (status as any).smtp_connected = false;
      (status as any).smtp_message = `❌ ${e.message || e}`;
    }
  } else {
    (status as any).smtp_connected = false;
    (status as any).smtp_message = "❌ SMTP credentials not configured — set SMTP_USER and SMTP_PASSWORD in Vercel env vars";
  }

  return NextResponse.json(status);
}
