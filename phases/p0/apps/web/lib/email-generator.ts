/**
 * In-app email generator for outreach emails.
 * Works on Vercel without external Python backends.
 */

interface EmailContext {
  company?: string;
  jobTitle?: string;
  recipientName?: string;
  senderName?: string;
  senderEmail?: string;
  intro?: string;
  body?: string;
  closing?: string;
}

const COLD_HTML_TEMPLATE = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background-color:#f4f4f4}.container{max-width:600px;margin:0 auto;padding:20px;background-color:#fff}.header{border-bottom:2px solid #2563eb;padding-bottom:16px;margin-bottom:24px}.header h1{font-size:18px;color:#1a1a1a;margin:0}.body-text{font-size:15px;line-height:1.6;color:#333}.cta-button{display:inline-block;padding:12px 24px;background-color:#2563eb;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0;font-weight:500}.signature{margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:14px;color:#666}@media(max-width:480px){.container{padding:12px}}</style></head>
<body><div class="container">
<div class="header"><h1>{{HEADER}}</h1></div>
<div class="body-text">
<p>Hi {{NAME}},</p>
<p>{{INTRO}}</p>
<p>{{BODY}}</p>
<p>{{CLOSING}}</p>
</div>
<div class="signature"><p><strong>{{SENDER}}</strong></p></div>
</div></body></html>`;

const COLD_TEXT_TEMPLATE = `Hi {{NAME}},

{{INTRO}}

{{BODY}}

{{CLOSING}}

Best regards,
{{SENDER}}`;

function buildPersonalization(ctx: EmailContext) {
  const company = ctx.company || "the team";
  const jobTitle = ctx.jobTitle || "the open position";

  return {
    subject: `Excited to connect — ${jobTitle} role at ${company}`,
    intro: `I came across the ${jobTitle} role at ${company} and was immediately drawn to the opportunity. I believe my background aligns well with what you're looking for.`,
    body: `I've been following ${company}'s work and I'm impressed by your team's impact. I'd love to bring my experience to contribute to your continued success.`,
    closing: `I'd welcome the chance to discuss how I can help ${company} achieve its goals. I'm available for a call at your convenience.`,
  };
}

export function generateOutreachEmail(params: {
  job?: { title?: string; company?: string; location?: string; description?: string };
  recipientEmail?: string;
  recipientName?: string;
  templateType?: string;
}): { subject: string; body_html: string; body_text: string } {
  const job = params.job || {};
  const company = job.company || "the team";
  const jobTitle = job.title || "the position";
  const recipientName = params.recipientName || "Hiring Manager";

  const ctx: EmailContext = {
    company,
    jobTitle,
    recipientName,
    senderName: (process.env.SENDER_NAME as string) || "Job Application Platform",
    senderEmail: (process.env.SMTP_USER as string) || "",
  };

  const personalization = buildPersonalization(ctx);

  const vars: Record<string, string> = {
    HEADER: `Opportunity at ${company}`,
    NAME: recipientName,
    INTRO: personalization.intro,
    BODY: personalization.body,
    CLOSING: personalization.closing,
    SENDER: ctx.senderName || "",
  };

  let html = COLD_HTML_TEMPLATE;
  let text = COLD_TEXT_TEMPLATE;
  for (const [key, value] of Object.entries(vars)) {
    html = html.replaceAll(`{{${key}}}`, value);
    text = text.replaceAll(`{{${key}}}`, value);
  }

  return {
    subject: personalization.subject,
    body_html: html,
    body_text: text,
  };
}
