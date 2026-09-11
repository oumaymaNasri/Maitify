import { cookies } from "next/headers";

import type { AuthResult, SessionUser } from "@/lib/auth/session";
import { canManage } from "@/lib/auth/session";
import {
  SESSION_COOKIE_NAME,
  decodeSessionCookie,
  permissionsForRole,
  type SessionCookiePayload,
} from "@/lib/auth/session-cookie";

function userFromPayload(payload: SessionCookiePayload): SessionUser {
  return {
    name: payload.name,
    email: payload.email,
    role: payload.role,
    permissions: permissionsForRole(payload.role),
    technicianId: payload.technicianId ?? null,
  };
}

export function getSession(): SessionUser | null {
  const raw = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;
  const payload = decodeSessionCookie(raw);
  if (!payload) return null;
  return userFromPayload(payload);
}

export function hasSession(): boolean {
  return getSession() != null;
}

export function requireSessionAction(): AuthResult {
  const user = getSession();
  if (!user) {
    return { ok: false, error: "Session expirée. Veuillez vous reconnecter." };
  }
  return { ok: true, user };
}

export function requireManageAction(): AuthResult {
  const user = getSession();
  if (!user) {
    return { ok: false, error: "Session expirée. Veuillez vous reconnecter." };
  }
  if (!canManage(user)) {
    return { ok: false, error: "Accès refusé : rôle Directeur ou Administrateur requis." };
  }
  return { ok: true, user };
}

export function authorizeApiRequest(): AuthResult {
  return requireManageAction();
}
