import { defaultNameForRole, permissionsForRole } from "@/lib/auth/session-cookie";

export type AppRole = "TECHNICIEN" | "RESPONSABLE" | "ADMIN";

export type SessionUser = {
  name: string;
  email: string;
  role: AppRole;
  permissions: string[];
  technicianId?: string | null;
};

/** Profil mock par défaut (tests / fallback documentation). */
export const MOCK_SESSION_USER: SessionUser = {
  name: "Directeur GMAO",
  email: "maintenance@nutrifish.tn",
  role: "RESPONSABLE",
  permissions: ["ALL"],
};

export type AuthResult = { ok: true; user: SessionUser } | { ok: false; error: string };

export function buildSessionUser(role: AppRole, email: string, name?: string): SessionUser {
  return {
    name: name?.trim() || defaultNameForRole(role),
    email: email.trim(),
    role,
    permissions: permissionsForRole(role),
  };
}

export function isManager(user: SessionUser): boolean {
  return user.permissions.includes("ALL") || user.role === "RESPONSABLE" || user.role === "ADMIN";
}

export function canManage(user: SessionUser, _permission?: string): boolean {
  if (user.permissions.includes("ALL")) return true;
  if (isManager(user)) return true;
  return false;
}

export function roleLabelFr(role: AppRole): string {
  switch (role) {
    case "ADMIN":
      return "Administrateur";
    case "RESPONSABLE":
      return "Directeur";
    default:
      return "Technicien";
  }
}
