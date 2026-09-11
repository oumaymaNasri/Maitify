"use server";

import { UserRole } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { AppRole } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { SESSION_COOKIE_NAME, encodeSessionCookie, permissionsForRole } from "@/lib/auth/session-cookie";
import { loginRoleMatchesAccount, userRoleToAppRole } from "@/lib/auth/user-role-map";
import { prisma } from "@/lib/db/prisma";

export type LoginActionResult = { ok: false; error: string };

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

type DbAuthUserRow = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  password_hash: string | null;
};

function parseRole(raw: FormDataEntryValue | null): AppRole | null {
  const v = raw?.toString();
  if (v === "RESPONSABLE" || v === "TECHNICIEN") return v;
  return null;
}

/** Lecture SQL directe — évite les erreurs si le client Prisma en cache n'a pas encore passwordHash. */
async function findUserForLogin(email: string): Promise<DbAuthUserRow | null> {
  try {
    const rows = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, role: true, passwordHash: true },
    });
    if (!rows) return null;
    return {
      id: rows.id,
      email: rows.email,
      name: rows.name,
      role: rows.role,
      password_hash: rows.passwordHash,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (!message.includes("passwordHash") && !message.includes("Unknown field")) {
      throw e;
    }
    const rows = await prisma.$queryRaw<DbAuthUserRow[]>`
      SELECT id, email, name, role, password_hash
      FROM "User"
      WHERE LOWER(email) = LOWER(${email})
      LIMIT 1
    `;
    return rows[0] ?? null;
  }
}

export async function loginAction(formData: FormData): Promise<LoginActionResult> {
  const role = parseRole(formData.get("role"));
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  if (!role) {
    console.warn("[NutriFish Auth] Échec — profil non sélectionné.");
    return { ok: false, error: "Sélectionnez un espace (Directeur ou Technicien)." };
  }

  if (!email) {
    console.warn(`[NutriFish Auth] Échec — identifiant manquant (rôle=${role}).`);
    return { ok: false, error: "Identifiant ou e-mail requis." };
  }

  if (!password) {
    return { ok: false, error: "Mot de passe requis." };
  }

  let dbUser: DbAuthUserRow | null;
  try {
    dbUser = await findUserForLogin(email);
  } catch (e) {
    console.error("[NutriFish Auth] Erreur base de données :", e);
    return {
      ok: false,
      error: "Erreur serveur. Exécutez : npm run db:generate puis redémarrez le serveur (npm run dev:fresh).",
    };
  }

  if (!dbUser?.password_hash) {
    console.warn(`[NutriFish Auth] Échec — compte introuvable ou sans mot de passe : ${email}`);
    return {
      ok: false,
      error: "Identifiants incorrects. Lancez npm run db:seed:users si les comptes n'existent pas encore.",
    };
  }

  const passwordOk = await verifyPassword(password, dbUser.password_hash);
  if (!passwordOk) {
    console.warn(`[NutriFish Auth] Échec — mot de passe invalide pour ${email}.`);
    return { ok: false, error: "Identifiants incorrects." };
  }

  if (!loginRoleMatchesAccount(role, dbUser.role)) {
    console.warn(
      `[NutriFish Auth] Échec — espace ${role} incompatible avec le compte ${dbUser.role} (${email}).`,
    );
    return {
      ok: false,
      error: `Ce compte est un profil « ${dbUser.role} ». Sélectionnez le bon espace de connexion.`,
    };
  }

  const appRole = userRoleToAppRole(dbUser.role);
  const destination = "/dashboard";
  const displayName = dbUser.name?.trim() || email;

  let technicianId: string | null = null;
  if (appRole === "TECHNICIEN") {
    const tech = await prisma.technician.findFirst({
      where: { userId: dbUser.id },
      select: { id: true },
    });
    if (!tech) {
      return {
        ok: false,
        error:
          "Profil technicien non lié à ce compte. Relancez npm run db:seed:users ou contactez le Directeur.",
      };
    }
    technicianId = tech.id;
  }

  cookies().set(
    SESSION_COOKIE_NAME,
    encodeSessionCookie({
      role: appRole,
      email: dbUser.email,
      name: displayName,
      technicianId,
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    },
  );

  console.info(
    `[NutriFish Auth] Connexion réussie — rôle=${appRole}, email=${dbUser.email}, permissions=${permissionsForRole(appRole).join(",")}, destination=${destination}`,
  );

  redirect(destination);
}

export async function logoutAction(): Promise<void> {
  const session = cookies().get(SESSION_COOKIE_NAME)?.value;
  cookies().delete(SESSION_COOKIE_NAME);
  console.info(`[NutriFish Auth] Déconnexion${session ? " — session révoquée" : ""}.`);
  redirect("/");
}
