/**
 * prisma generate tolerant Windows / OneDrive :
 * - stoppe les serveurs Next locaux qui verrouillent query_engine-windows.dll.node
 * - nettoie les .tmp orphelins
 * - retente generate ; continue si un client valide existe deja
 */
const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");
const clientDir = path.join(root, "node_modules", ".prisma", "client");
const indexFile = path.join(clientDir, "index.js");

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function clientLooksValid() {
  if (!fs.existsSync(indexFile)) return false;
  const engines = fs.readdirSync(clientDir).filter((name) => /^query_engine/.test(name) && !name.includes(".tmp"));
  return engines.length > 0;
}

function cleanTmpEngines() {
  if (!fs.existsSync(clientDir)) return;
  for (const name of fs.readdirSync(clientDir)) {
    if (name.includes(".tmp")) {
      try {
        fs.unlinkSync(path.join(clientDir, name));
      } catch {
        /* ignore */
      }
    }
  }
}

function stopLocalNextServers() {
  const rootEscaped = root.replace(/\\/g, "\\\\").replace(/'/g, "''");
  if (process.platform === "win32") {
    try {
      execSync(
        `powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name='node.exe'\\" | Where-Object { $_.CommandLine -and ($_.CommandLine -like '*${rootEscaped}*' -or $_.CommandLine -like '*next\\\\dist\\\\bin\\\\next dev*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"`,
        { stdio: "ignore", shell: true, cwd: root },
      );
    } catch {
      /* ignore */
    }
    return;
  }

  try {
    execSync(`pkill -f "${root}.*next dev" || true`, { stdio: "ignore", shell: true });
  } catch {
    /* ignore */
  }
}

function runGenerate() {
  execSync(`node "${prismaCli}" generate`, { stdio: "inherit", cwd: root, shell: true });
}

if (!fs.existsSync(prismaCli)) {
  process.exit(0);
}

stopLocalNextServers();
sleep(800);
cleanTmpEngines();

const maxAttempts = 3;
for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  try {
    runGenerate();
    process.exit(0);
  } catch {
    if (attempt < maxAttempts) {
      console.warn(`[prisma] generate echoue (tentative ${attempt}/${maxAttempts}) — nouvel essai…`);
      stopLocalNextServers();
      sleep(1200);
      cleanTmpEngines();
    }
  }
}

if (clientLooksValid()) {
  console.warn(
    "[prisma] generate impossible (fichier verrouille). Client Prisma existant detecte — poursuite.",
  );
  process.exit(0);
}

console.error(
  "[prisma] Echec generate. Fermez les serveurs Next.js locaux (npm run dev), pausez OneDrive sur ce dossier, puis relancez.",
);
process.exit(1);
