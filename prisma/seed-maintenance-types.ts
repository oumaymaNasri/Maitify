/**
 * Seed référentiel MaintenanceType — Lot 1.
 * Usage manuel uniquement : npx tsx prisma/seed-maintenance-types.ts
 * Ne pas appeler depuis build / start-prod.
 * N'écrit que dans MaintenanceType (upsert par code) — nécessite migration Lot 1 appliquée.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TYPES = [
  {
    code: "CTRL_VISUEL",
    label: "Contrôle visuel",
    description: "Inspection visuelle de l'équipement",
    defaultInstructions: "Contrôler l'état général, bruits anormaux, fuites visibles.",
    defaultDurationMin: 15,
  },
  {
    code: "LUBRIFICATION",
    label: "Lubrification",
    description: "Graissage / lubrification",
    defaultInstructions: "Appliquer le graissage selon points constructeur.",
    defaultDurationMin: 20,
  },
  {
    code: "NETTOYAGE",
    label: "Nettoyage",
    description: "Nettoyage machine",
    defaultInstructions: "Nettoyer les zones accessibles et évacuer les résidus.",
    defaultDurationMin: 30,
  },
  {
    code: "HUILE",
    label: "Contrôle / changement d'huile",
    description: "Niveau et qualité huile",
    defaultInstructions: "Vérifier niveau et aspect ; compléter ou changer si requis.",
    defaultDurationMin: 25,
  },
  {
    code: "INSP_MECA",
    label: "Inspection mécanique",
    description: "Contrôle mécanique approfondi",
    defaultInstructions: "Contrôler fixations, courroies, roulements, jeux.",
    defaultDurationMin: 60,
  },
  {
    code: "REVISION_GEN",
    label: "Révision générale",
    description: "Révision annuelle / périodique majeure",
    defaultInstructions: "Suivre la gamme de révision complète.",
    defaultDurationMin: 240,
  },
] as const;

async function main() {
  console.log("[seed-maintenance-types] Upsert du référentiel…");
  for (const t of TYPES) {
    await prisma.maintenanceType.upsert({
      where: { code: t.code },
      create: { ...t },
      update: {
        label: t.label,
        description: t.description,
        defaultInstructions: t.defaultInstructions,
        defaultDurationMin: t.defaultDurationMin,
      },
    });
    console.log(`  ✓ ${t.code}`);
  }
  console.log("[seed-maintenance-types] Terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
