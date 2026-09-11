/**
 * postinstall tolerant : prisma generate echoue souvent sous OneDrive (EPERM rename DLL).
 */
const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");

if (!fs.existsSync(prismaCli)) {
  process.exit(0);
}

try {
  execSync(`node "${prismaCli}" generate`, { stdio: "inherit", cwd: root, shell: true });
} catch {
  console.warn(
    "[postinstall] prisma generate a echoue (fichier verrouille / OneDrive). Lancez ensuite : npm.cmd run db:generate",
  );
}
