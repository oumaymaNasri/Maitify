import type { AppRole } from "@/lib/auth/session";

export const SESSION_COOKIE_NAME = "nutrifish_gmao_session";

export type SessionCookiePayload = {
  role: AppRole;
  email: string;
  name: string;
  technicianId?: string | null;
};

export function encodeSessionCookie(payload: SessionCookiePayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeSessionCookie(value: string): SessionCookiePayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as SessionCookiePayload;
    if (!parsed?.email || !parsed?.role || !parsed?.name) return null;
    if (parsed.role !== "RESPONSABLE" && parsed.role !== "TECHNICIEN" && parsed.role !== "ADMIN") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function permissionsForRole(role: AppRole): string[] {
  if (role === "TECHNICIEN") return ["INTERVENIR"];
  return ["ALL"];
}

export function defaultNameForRole(role: AppRole): string {
  return role === "TECHNICIEN" ? "Technicien GMAO" : "Directeur GMAO";
}
