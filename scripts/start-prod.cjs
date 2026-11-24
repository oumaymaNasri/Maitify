/**
 * Démarrage production : génération client Prisma + Next.js.
 * Lot 3C : aucune modification de schéma ni seed automatique.
 * Les migrations SQL restent une opération explicite et séparée.
 */
const { execSync } = require("node:child_process");
const path = require("node:path");

const root = path.join(__dirname, "..");
const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");

function run(cmd) {
  execSync(cmd, { stdio: "inherit", cwd: root, shell: true, env: process.env });
}

if (!process.env.DATABASE_URL) {
  console.error("[start-prod] DATABASE_URL est obligatoire.");
  process.exit(1);
}

if (process.env.ALLOW_DB_PUSH === "1" || process.env.ALLOW_AUTO_SEED === "1") {
  console.error(
    "[start-prod] REFUS: ALLOW_DB_PUSH / ALLOW_AUTO_SEED ne sont plus supportés (Lot 3C). Migrations et seeds = opérations manuelles séparées.",
  );
  process.exit(1);
}

console.log("[start-prod] prisma generate…");
run(`node "${prismaCli}" generate`);

console.log("[start-prod] aucun db push / seed automatique (Lot 3C).");

const port = process.env.PORT || "3000";
console.log(`[start-prod] Next.js sur 0.0.0.0:${port}`);
run(`node "${nextBin}" start -H 0.0.0.0 -p ${port}`);
