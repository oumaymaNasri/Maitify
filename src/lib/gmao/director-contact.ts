/** E-mail officiel du Directeur de la maintenance (login + destinataire des rappels). */
export const DIRECTOR_LOGIN_EMAIL = "maintenance@nutrifish.tn";

export const DIRECTOR_EMAIL_ALIASES = ["directeur@nutrifish.local", "responsable@nutrifish.local"] as const;

export function canonicalLoginEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if ((DIRECTOR_EMAIL_ALIASES as readonly string[]).includes(normalized)) {
    return DIRECTOR_LOGIN_EMAIL;
  }
  return normalized;
}

export function maintenanceNotifyEmail(): string {
  const fromEnv = process.env.MAINTENANCE_NOTIFY_EMAIL?.trim();
  return fromEnv || DIRECTOR_LOGIN_EMAIL;
}
