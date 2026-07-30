import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email-sender";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email as string;
    
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const signInUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/callback/magic-link?email=${encodeURIComponent(email)}`;

    console.log('[signin] SMTP_USER:', process.env.SMTP_USER || 'NOT SET');
    console.log('[signin] SMTP_PASS length:', (process.env.SMTP_PASSWORD || '').length);
    console.log('[signin] SMTP_HOST:', process.env.SMTP_HOST || 'NOT SET');
    console.log('[signin] SMTP_PORT:', process.env.SMTP_PORT || 'NOT SET');
    console.log('[signin] Sending magic link to:', email);

    const result = await sendEmail({
      toEmail: email,
      toName: email.split("@")[0] || "User",
      subject: "Sign in to Job Platform",
      bodyHtml: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto">
          <h2 style="color:#2563eb">Sign in to Job Application Platform</h2>
          <p>Click the button below to sign in:</p>
          <a href="${signInUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0">
            Sign in
          </a>
          <p style="color:#666;font-size:12px">If you didn't request this, you can ignore this email.</p>
        </div>
      `,
      bodyText: `Sign in to Job Application Platform\n\nUse this link: ${signInUrl}\n\nIf you didn't request this, ignore this email.`,
    });

    console.log('[signin] Send result — success:', result.success, 'error:', result.error || 'none');

    if (result.success) {
      return NextResponse.json({ status: "sent", messageId: result.messageId });
    } else {
      return NextResponse.json({ status: "failed", error: result.error }, { status: 200 });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
