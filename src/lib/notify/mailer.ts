import { maintenanceNotifyEmail } from "@/lib/gmao/director-contact";

export type OutboundEmail = {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
};

export type MailResult = { ok: true; provider: string } | { ok: false; error: string };

export type MailerDiagnostics = {
  configured: boolean;
  provider: "resend" | "sendgrid" | "smtp" | "none";
  to: string;
  from: string | null;
};

function toList(to: string | string[]): string[] {
  return (Array.isArray(to) ? to : [to]).map((e) => e.trim()).filter(Boolean);
}

export function defaultFromAddress(): string {
  return (
    process.env.EMAIL_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    "NutriFish GMAO <noreply@nutrifish.tn>"
  );
}

export function mailerDiagnostics(): MailerDiagnostics {
  if (process.env.RESEND_API_KEY?.trim()) {
    return { configured: true, provider: "resend", to: maintenanceNotifyEmail(), from: defaultFromAddress() };
  }
  if (process.env.SENDGRID_API_KEY?.trim()) {
    return { configured: true, provider: "sendgrid", to: maintenanceNotifyEmail(), from: defaultFromAddress() };
  }
  if (process.env.SMTP_URL?.trim() || process.env.SMTP_HOST?.trim()) {
    return { configured: true, provider: "smtp", to: maintenanceNotifyEmail(), from: defaultFromAddress() };
  }
  return { configured: false, provider: "none", to: maintenanceNotifyEmail(), from: process.env.EMAIL_FROM?.trim() || null };
}

async function sendViaResend(email: OutboundEmail, recipients: string[]): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY manquant." };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: defaultFromAddress(),
      to: recipients,
      subject: email.subject,
      html: email.html,
      text: email.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 280)}` };
  }
  return { ok: true, provider: "resend" };
}

async function sendViaSendgrid(email: OutboundEmail, recipients: string[]): Promise<MailResult> {
  const apiKey = process.env.SENDGRID_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "SENDGRID_API_KEY manquant." };

  const fromRaw = defaultFromAddress();
  const fromMatch = fromRaw.match(/^(.*)<([^>]+)>$/);
  const from = fromMatch
    ? { name: fromMatch[1].trim().replace(/^"|"$/g, ""), email: fromMatch[2].trim() }
    : { email: fromRaw };

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: recipients.map((emailAddr) => ({ email: emailAddr })) }],
      from,
      subject: email.subject,
      content: [
        { type: "text/plain", value: email.text },
        { type: "text/html", value: email.html },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, error: `SendGrid ${res.status}: ${body.slice(0, 280)}` };
  }
  return { ok: true, provider: "sendgrid" };
}

async function sendViaSmtp(email: OutboundEmail, recipients: string[]): Promise<MailResult> {
  const smtpUrl = process.env.SMTP_URL?.trim();
  const host = process.env.SMTP_HOST?.trim();
  if (!smtpUrl && !host) return { ok: false, error: "SMTP_HOST ou SMTP_URL manquant." };

  try {
    const { createTransport } = await import("nodemailer");
    const port = Number.parseInt(process.env.SMTP_PORT ?? "587", 10) || 587;
    const transporter = smtpUrl
      ? createTransport(smtpUrl)
      : createTransport({
          host,
          port,
          secure: process.env.SMTP_SECURE === "1" || process.env.SMTP_SECURE === "true" || port === 465,
          auth:
            process.env.SMTP_USER && process.env.SMTP_PASS
              ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
              : undefined,
        });

    await transporter.sendMail({
      from: defaultFromAddress(),
      to: recipients.join(", "),
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
    return { ok: true, provider: "smtp" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function sendNotificationEmail(email: OutboundEmail): Promise<MailResult> {
  const recipients = toList(email.to);
  if (!recipients.length) return { ok: false, error: "Destinataire vide." };

  if (process.env.RESEND_API_KEY?.trim()) return sendViaResend(email, recipients);
  if (process.env.SENDGRID_API_KEY?.trim()) return sendViaSendgrid(email, recipients);
  if (process.env.SMTP_URL?.trim() || process.env.SMTP_HOST?.trim()) return sendViaSmtp(email, recipients);

  console.error("[notify] Aucun fournisseur e-mail. Définissez RESEND_API_KEY, SENDGRID_API_KEY ou SMTP_HOST sur Vercel.", {
    to: recipients,
    subject: email.subject,
  });
  return {
    ok: false,
    error: "Aucun fournisseur e-mail configuré. Ajoutez RESEND_API_KEY, SENDGRID_API_KEY ou SMTP_HOST / SMTP_USER / SMTP_PASS sur Vercel.",
  };
}
