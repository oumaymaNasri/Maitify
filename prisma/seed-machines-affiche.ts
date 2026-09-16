/**
 * Importe la liste « affiche les machines.xlsx » (colonne Nom de la machine).
 * Usage : npm run db:seed:machines
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const prisma = new PrismaClient();

const DEFAULT_LOCATION = "Usine NutriFish";
const SOURCE_JSON = resolve(process.cwd(), "prisma/data/affiche-les-machines.json");

function loadNames(): string[] {
  const raw = JSON.parse(readFileSync(SOURCE_JSON, "utf8")) as string[];
  const seen = new Set<string>();
  const names: string[] = [];
  for (const item of raw) {
    const name = item.trim().replace(/\s+/g, " ");
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

async function main() {
  const names = loadNames();
  console.log(`[seed-machines] ${names.length} noms uniques à importer…`);

  let created = 0;
  let skipped = 0;

  for (const name of names) {
    const existing = await prisma.machine.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) {
      skipped += 1;
      continue;
    }
    await prisma.machine.create({
      data: {
        name,
        location: DEFAULT_LOCATION,
        assetStatus: "OPERATIONAL",
        maintenanceSector: "HEBDOMADAIRE",
      },
    });
    created += 1;
  }

  const total = await prisma.machine.count();
  console.log(`[seed-machines] créées=${created} déjà présentes=${skipped} total parc=${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
