import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email-sender";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const tokens = new Map<string, string>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email as string;
    
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const token = crypto.randomBytes(32).toString("hex");
    tokens.set(token, email.toLowerCase());
    // Expire after 15 minutes
    setTimeout(() => tokens.delete(token), 15 * 60 * 1000);

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const signInUrl = `${baseUrl}/api/auth/magic-link?token=${token}`;

    console.log('[signin] Sending magic link to:', email, 'token:', token.slice(0, 8) + '...');

    const result = await sendEmail({
      toEmail: email,
      toName: email.split("@")[0] || "User",
      subject: "Sign in to Job Platform",
      bodyHtml: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto">
          <h2 style="color:#2563eb">Sign in to Job Application Platform</h2>
          <p>Click the button below to sign in:</p>
          <a href="${signInUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0">
            Sign in to Dashboard
          </a>
          <p style="color:#666;font-size:12px">If you didn't request this, you can ignore this email.</p>
        </div>
      `,
      bodyText: `Sign in to Job Application Platform\n\nUse this link: ${signInUrl}\n\nIf you didn't request this, ignore this email.`,
    });

    if (result.success) {
      return NextResponse.json({ status: "sent", messageId: result.messageId });
    } else {
      return NextResponse.json({ status: "failed", error: result.error }, { status: 200 });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing_token", request.url));
  }

  const email = tokens.get(token);
  if (!email) {
    return NextResponse.redirect(new URL("/login?error=expired", request.url));
  }

  tokens.delete(token);
  return NextResponse.redirect(new URL(`/login?magic_token=${token}&email=${encodeURIComponent(email)}`, request.url));
}

