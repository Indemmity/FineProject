import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email-sender";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function createMagicToken(email: string): string {
  const secret = process.env.NEXTAUTH_SECRET || "dev-secret";
  const emailBase64 = Buffer.from(email.toLowerCase()).toString("base64url");
  const hash = crypto.createHmac("sha256", secret).update(email.toLowerCase()).digest("hex").slice(0, 16);
  return `${emailBase64}.${hash}`;
}

function verifyMagicToken(token: string): string | null {
  try {
    const [emailBase64, hash] = token.split(".");
    if (!emailBase64 || !hash) return null;
    const email = Buffer.from(emailBase64, "base64url").toString("utf-8");
    const secret = process.env.NEXTAUTH_SECRET || "dev-secret";
    const expectedHash = crypto.createHmac("sha256", secret).update(email.toLowerCase()).digest("hex").slice(0, 16);
    return hash === expectedHash ? email : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email as string;
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const token = createMagicToken(email);
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const signInUrl = `${baseUrl}/login?magic_token=${token}`;

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
            Sign in to Dashboard
          </a>
          <p style="color:#666;font-size:12px">If you didn't request this, you can ignore this email.</p>
        </div>
      `,
      bodyText: `Sign in to Job Application Platform\n\nUse this link: ${signInUrl}\n\nIf you didn't request this, ignore this email.`,
    });

    return NextResponse.json({
      status: result.success ? "sent" : "failed",
      messageId: result.messageId,
      error: result.error,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!token) return NextResponse.json({ error: "No token" }, { status: 400 });

  const email = verifyMagicToken(token);
  if (!email) return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });

  return NextResponse.json({ email });
}
