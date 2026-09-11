import type { UserRole } from "@prisma/client";

import type { AppRole } from "@/lib/auth/session";

export function userRoleToAppRole(role: UserRole): AppRole {
  switch (role) {
    case "ADMIN":
      return "ADMIN";
    case "RESPONSABLE":
      return "RESPONSABLE";
    default:
      return "TECHNICIEN";
  }
}

/** Vérifie que le rôle choisi sur le portail correspond au compte en base. */
export function loginRoleMatchesAccount(selected: AppRole, accountRole: UserRole): boolean {
  if (accountRole === "ADMIN") return selected === "RESPONSABLE";
  return userRoleToAppRole(accountRole) === selected;
}
