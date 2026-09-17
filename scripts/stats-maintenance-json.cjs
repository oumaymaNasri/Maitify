const path = require("node:path");
const c = require(path.join(__dirname, "../prisma/data/maintenances-correctives.json"));
const p = require(path.join(__dirname, "../prisma/data/maintenances-preventives.json"));

function keys(arr, k) {
  const s = {};
  for (const r of arr) {
    const v = String(r[k] || "").trim();
    if (!v) continue;
    s[v] = (s[v] || 0) + 1;
  }
  return Object.entries(s)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
}

console.log("corr", c.length, "prev", p.length);
console.log("TYPE", keys(c, "TYPE DE MAINTENANCE"));
console.log("Op", keys(c, "Opération"));
console.log("interv", keys(c, "Intervanant"));
console.log("typeP", keys(p, "Type d'intervention"));
console.log("tech", keys(p, "Nom de Technicien"));
console.log("duree", keys(p, "Durée d'intervention"));
console.log("corr rapport", c.filter((r) => r["RAPPORT D'INTERVENTION"]).length);
console.log("corr desc", c.filter((r) => r["DESCRIPTION DE DYSFONCTIONNEMENT"]).length);
console.log("corr machine", c.filter((r) => r["Nom de la machine"]).length);
console.log("prev machine", p.filter((r) => r["Nom de la machine"]).length);
console.log("prev nettoyage", keys(p, "Nettoyage"));
console.log("corr pieces", c.filter((r) => r["PIECE DE RECHANGE ET CONSOMMABLES"]).length);
console.log("prev pieces", p.filter((r) => r["Pièce de rechange"]).length);
console.log(
  "corr unique machines",
  new Set(c.map((r) => String(r["Nom de la machine"] || "").trim().toLowerCase()).filter(Boolean)).size,
);
console.log(
  "prev unique machines",
  new Set(p.map((r) => String(r["Nom de la machine"] || "").trim().toLowerCase()).filter(Boolean)).size,
);
console.log("corr empty machine", c.filter((r) => !String(r["Nom de la machine"] || "").trim()).length);
