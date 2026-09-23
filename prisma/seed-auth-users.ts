/**

 * Crée ou met à jour les comptes Directeur et Technicien pour la connexion GMAO.

 * Usage : npm run db:seed:users

 */

import { PrismaClient, TechnicianSpecialty, UserRole } from "@prisma/client";

import { hashPassword } from "../src/lib/auth/password";
import { DIRECTOR_EMAIL_ALIASES, DIRECTOR_LOGIN_EMAIL } from "../src/lib/gmao/director-contact";



const prisma = new PrismaClient();



export const DEMO_AUTH_USERS = [

  {

    email: "maintenance@nutrifish.tn",

    name: "Directeur GMAO",

    role: UserRole.RESPONSABLE,

    password: "Gmao2026!",

  },

  {

    email: "technicien@nutrifish.local",

    name: "Technicien GMAO",

    role: UserRole.TECHNICIEN,

    password: "Gmao2026!",

    technicianFirstName: "Technicien",

    technicianLastName: "GMAO",

  },

] as const;



async function main() {

  console.log("[seed-auth] Création des comptes de connexion…");



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



  for (const account of DEMO_AUTH_USERS) {

    const passwordHash = await hashPassword(account.password);

    const user = await prisma.user.upsert({

      where: { email: account.email },

      update: {

        name: account.name,

        role: account.role,

        passwordHash,

      },

      create: {

        email: account.email,

        name: account.name,

        role: account.role,

        passwordHash,

      },

    });



    if (account.role === UserRole.TECHNICIEN && "technicianFirstName" in account) {

      const linked = await prisma.technician.findFirst({

        where: { OR: [{ userId: user.id }, { email: account.email }] },

      });

      if (linked) {

        await prisma.technician.update({

          where: { id: linked.id },

          data: {

            userId: user.id,

            email: account.email,

            firstName: account.technicianFirstName,

            lastName: account.technicianLastName,

          },

        });

      } else {

        await prisma.technician.create({

          data: {

            firstName: account.technicianFirstName,

            lastName: account.technicianLastName,

            specialty: TechnicianSpecialty.MECANIQUE,

            email: account.email,

            userId: user.id,

          },

        });

      }

      console.log(`  ✓ ${account.role} — ${account.email} (profil Technicien lié)`);

    } else {

      console.log(`  ✓ ${account.role} — ${account.email}`);

    }

  }



  console.log("\n[seed-auth] Comptes prêts. Mot de passe commun : Gmao2026!");

}



main()

  .catch((e) => {

    console.error(e);

    process.exit(1);

  })

  .finally(() => prisma.$disconnect());

