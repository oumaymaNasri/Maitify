/**
 * Crée ou met à jour les comptes Directeur et Technicien pour la connexion GMAO.
 *
 * Usage : npm run db:seed:users
 *
 * Aucun mot de passe n'est codé en dur. Ils sont lus dans l'environnement :
 *   SEED_DIRECTOR_PASSWORD    — compte Directeur  (DIRECTOR_LOGIN_EMAIL)
 *   SEED_TECHNICIAN_PASSWORD  — compte Technicien (technicien@nutrifish.local)
 *
 * Règles :
 *   - compte absent  : créé uniquement si son mot de passe est fourni (sinon ignoré) ;
 *   - compte existant : nom / rôle mis à jour ; mot de passe remplacé UNIQUEMENT si la
 *     variable correspondante est définie (un seed sans variable ne réinitialise rien).
 */

import { PrismaClient, TechnicianSpecialty, UserRole } from "@prisma/client";

import { hashPassword } from "../src/lib/auth/password";
import { DIRECTOR_EMAIL_ALIASES, DIRECTOR_LOGIN_EMAIL } from "../src/lib/gmao/director-contact";

const prisma = new PrismaClient();

const MIN_PASSWORD_LENGTH = 12;

type SeedAccount = {
  email: string;
  name: string;
  role: UserRole;
  passwordEnv: string;
  technicianFirstName?: string;
  technicianLastName?: string;
};

export const SEED_AUTH_USERS: readonly SeedAccount[] = [
  {
    email: DIRECTOR_LOGIN_EMAIL,
    name: "Directeur GMAO",
    role: UserRole.RESPONSABLE,
    passwordEnv: "SEED_DIRECTOR_PASSWORD",
  },
  {
    email: "technicien@nutrifish.local",
    name: "Technicien GMAO",
    role: UserRole.TECHNICIEN,
    passwordEnv: "SEED_TECHNICIAN_PASSWORD",
    technicianFirstName: "Technicien",
    technicianLastName: "GMAO",
  },
];

function readPassword(envName: string): string | null {
  const value = process.env[envName]?.trim();
  if (!value) return null;
  if (value.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`${envName} doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`);
  }
  return value;
}

async function main() {
  console.log("[seed-auth] Création / mise à jour des comptes de connexion…");

  await prisma.user.deleteMany({ where: { email: "responsable@nutrifish.local" } }).catch(() => undefined);

  for (const alias of DIRECTOR_EMAIL_ALIASES) {
    const previous = await prisma.user.findUnique({ where: { email: alias } });
    if (!previous) continue;
    const already = await prisma.user.findUnique({ where: { email: DIRECTOR_LOGIN_EMAIL } });
    if (!already) {
      await prisma.user.update({ where: { id: previous.id }, data: { email: DIRECTOR_LOGIN_EMAIL, name: "Directeur GMAO" } });
      console.log(`  → e-mail Directeur migré : ${alias} → ${DIRECTOR_LOGIN_EMAIL}`);
    } else if (already.id !== previous.id) {
      await prisma.user.delete({ where: { id: previous.id } }).catch(() => undefined);
    }
  }

  for (const account of SEED_AUTH_USERS) {
    const password = readPassword(account.passwordEnv);
    const passwordHash = password ? await hashPassword(password) : null;
    const existing = await prisma.user.findUnique({ where: { email: account.email }, select: { id: true } });

    if (!existing && !passwordHash) {
      console.warn(`  ! ${account.email} absent et ${account.passwordEnv} non défini : compte non créé.`);
      continue;
    }

    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: { name: account.name, role: account.role, ...(passwordHash ? { passwordHash } : {}) },
        })
      : await prisma.user.create({
          data: { email: account.email, name: account.name, role: account.role, passwordHash: passwordHash! },
        });

    if (account.role === UserRole.TECHNICIEN && account.technicianFirstName && account.technicianLastName) {
      const linked = await prisma.technician.findFirst({
        where: { OR: [{ userId: user.id }, { email: account.email }] },
      });
      const profile = {
        userId: user.id,
        email: account.email,
        firstName: account.technicianFirstName,
        lastName: account.technicianLastName,
      };
      if (linked) {
        await prisma.technician.update({ where: { id: linked.id }, data: profile });
      } else {
        await prisma.technician.create({ data: { ...profile, specialty: TechnicianSpecialty.MECANIQUE } });
      }
    }

    const pwdNote = passwordHash ? "mot de passe défini" : "mot de passe inchangé";
    console.log(`  ✓ ${account.role} — ${account.email} (${existing ? "mis à jour" : "créé"}, ${pwdNote})`);
  }

  console.log("\n[seed-auth] Terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
