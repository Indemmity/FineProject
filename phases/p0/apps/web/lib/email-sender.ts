/**
 * SMTP email sender for Vercel deployment.
 * Uses nodemailer which is already a dependency.
 */

import nodemailer from 'nodemailer';

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(params: {
  toEmail: string;
  toName: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
}): Promise<SendResult> {
  const messageId = `<${crypto.randomUUID()}@job-platform>`;
  const smtpUser = process.env.SMTP_USER || '';
  const smtpPass = process.env.SMTP_PASSWORD || '';
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const senderName = process.env.SENDER_NAME || 'Job Application Platform';

  console.log(`\n${'='.repeat(50)}`);
  console.log(`[EMAIL] Sending to ${params.toEmail}`);
  console.log(`  From: ${senderName} <${smtpUser}>`);
  console.log(`  Subject: ${params.subject}`);
  console.log(`  SMTP: ${smtpHost}:${smtpPort}`);
  console.log(`  SMTP User: ${smtpUser ? 'configured' : 'MISSING!'}`);
  console.log(`  SMTP Pass: ${smtpPass ? 'configured' : 'MISSING!'}`);

  if (!smtpUser || !smtpPass) {
    console.log(`[EMAIL] SKIPPED — SMTP credentials not configured`);
    console.log(`${'='.repeat(50)}\n`);
    return { success: false, messageId, error: 'SMTP credentials not configured' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const info = await transporter.sendMail({
      from: `"${senderName}" <${smtpUser}>`,
      to: `"${params.toName}" <${params.toEmail}>`,
      subject: params.subject,
      html: params.bodyHtml,
      text: params.bodyText,
      messageId,
    });

    console.log(`[EMAIL] SENT! Message-ID: ${info.messageId}`);
    console.log(`${'='.repeat(50)}\n`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`[EMAIL] FAILED: ${msg}`);
    console.log(`${'='.repeat(50)}\n`);
    return { success: false, messageId, error: msg };
  }
}
