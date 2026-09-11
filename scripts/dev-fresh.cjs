/**
 * dev:fresh — clean .next, prisma, seed auth, next dev (Windows-safe).
 * Arrete le conteneur Docker app pour liberer le port 3000 en dev local.
 */
const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function run(cmd) {
  execSync(cmd, { stdio: "inherit", cwd: root, shell: true });
}

try {
  fs.rmSync(path.join(root, ".next"), { recursive: true, force: true });
  console.log("[OK] .next supprime");
} catch (error) {
  console.error(error);
  process.exit(1);
}

try {
  execSync("docker compose stop app", { stdio: "pipe", cwd: root, shell: true });
  console.log("[OK] Conteneur Docker app arrete — dev local sur http://localhost:3000");
} catch {
  console.log("[i] Docker app non arrete (deja stoppe ou Docker indisponible)");
}

run("node ./scripts/prisma-generate-safe.cjs");
run("node ./node_modules/prisma/build/index.js db push");
run("node ./node_modules/tsx/dist/cli.mjs prisma/seed-auth-users.ts");
run("node ./node_modules/next/dist/bin/next dev");
