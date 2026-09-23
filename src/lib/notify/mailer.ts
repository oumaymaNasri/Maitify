import { maintenanceNotifyEmail } from "@/lib/gmao/director-contact";

export type OutboundEmail = {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
};

export type MailResult = { ok: true; provider: string } | { ok: false; error: string };

function toList(to: string | string[]): string[] {
  return (Array.isArray(to) ? to : [to]).map((e) => e.trim()).filter(Boolean);
}

async function sendViaResend(email: OutboundEmail, recipients: string[]): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY manquant." };

  const from = process.env.EMAIL_FROM?.trim() || "NutriFish GMAO <noreply@nutrifish.tn>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
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

async function sendViaSmtp(email: OutboundEmail, recipients: string[]): Promise<MailResult> {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return { ok: false, error: "SMTP_HOST manquant." };

  try {
    const { createTransport } = await import("nodemailer");
    const port = Number.parseInt(process.env.SMTP_PORT ?? "587", 10) || 587;
    const transporter = createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === "1" || port === 465,
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    });
    const from = process.env.EMAIL_FROM?.trim() || process.env.SMTP_USER || maintenanceNotifyEmail();
    await transporter.sendMail({
      from,
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

  if (process.env.RESEND_API_KEY?.trim()) {
    return sendViaResend(email, recipients);
  }
  if (process.env.SMTP_HOST?.trim()) {
    return sendViaSmtp(email, recipients);
  }

  console.info("[notify] Aucun fournisseur e-mail (RESEND_API_KEY ou SMTP_HOST). Message non envoyé :", {
    to: recipients,
    subject: email.subject,
  });
  return { ok: false, error: "Aucun fournisseur e-mail configuré (RESEND_API_KEY ou SMTP_HOST)." };
}
