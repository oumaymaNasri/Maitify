const fs = require("node:fs");
const path = require("node:path");

const xmlPath = path.join(process.env.TEMP || "", "machines-xlsx", "unz", "xl", "worksheets", "sheet1.xml");
const xml = fs.readFileSync(xmlPath, "utf8");
const names = [...xml.matchAll(/<t>([^<]*)<\/t>/g)]
  .map((m) =>
    m[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .trim()
      .replace(/\s+/g, " "),
  )
  .filter((n) => n && n !== "Nom de la machine");

const seen = new Set();
const uniq = [];
for (const n of names) {
  const k = n.toLowerCase();
  if (seen.has(k)) continue;
  seen.add(k);
  uniq.push(n);
}

const outDir = path.join("prisma", "data");
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "affiche-les-machines.json");
fs.writeFileSync(outFile, JSON.stringify(uniq, null, 2));
console.log("written", uniq.length, "to", outFile);
