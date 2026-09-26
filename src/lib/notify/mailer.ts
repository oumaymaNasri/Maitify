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
  provider: "disabled";
  to: string;
  from: string | null;
};

/** Envoi d'e-mails définitivement désactivé (rappels in-app uniquement). */
export const EMAIL_NOTIFICATIONS_ENABLED = false;

export function mailerDiagnostics(): MailerDiagnostics {
  return {
    configured: false,
    provider: "disabled",
    to: maintenanceNotifyEmail(),
    from: null,
  };
}

export async function sendNotificationEmail(_email: OutboundEmail): Promise<MailResult> {
  return { ok: true, provider: "disabled" };
}
