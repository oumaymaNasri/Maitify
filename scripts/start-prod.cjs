/**
 * Démarrage production : schéma Prisma + comptes démo + Next.js.
 * Utilisé par Railway / Render / Docker.
 */
const { execSync } = require("node:child_process");
const path = require("node:path");

const root = path.join(__dirname, "..");
const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const seedUsers = path.join(root, "prisma", "seed-auth-users.ts");
const tsx = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");

function run(cmd) {
  execSync(cmd, { stdio: "inherit", cwd: root, shell: true, env: process.env });
}

if (!process.env.DATABASE_URL) {
  console.error("[start-prod] DATABASE_URL est obligatoire.");
  process.exit(1);
}

console.log("[start-prod] prisma generate…");
run(`node "${prismaCli}" generate`);

console.log("[start-prod] prisma db push…");
run(`node "${prismaCli}" db push --accept-data-loss`);

if (process.env.SEED_DEMO_USERS !== "0") {
  console.log("[start-prod] seed comptes démo…");
  run(`node "${tsx}" "${seedUsers}"`);
}

const port = process.env.PORT || "3000";
console.log(`[start-prod] Next.js sur 0.0.0.0:${port}`);
run(`node "${nextBin}" start -H 0.0.0.0 -p ${port}`);
