const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const os = require("node:os");

function unzipXlsx(xlsxPath, dest) {
  if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  const zipPath = path.join(dest, "book.zip");
  fs.copyFileSync(xlsxPath, zipPath);
  execFileSync("tar", ["-xf", zipPath, "-C", dest], { stdio: "ignore" });
}

function parseSharedStrings(xml) {
  if (!xml) return [];
  const out = [];
  const siBlocks = xml.split(/<si[ >]/).slice(1);
  for (const block of siBlocks) {
    const texts = [...block.matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => decode(m[1]));
    out.push(texts.join(""));
  }
  return out;
}

function decode(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function colToIndex(col) {
  let n = 0;
  for (const ch of col) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function parseSheet(sheetXml, shared) {
  const rows = new Map();
  const cellRe = /<c r="([A-Z]+)(\d+)"([^>]*)>(?:<v>([^<]*)<\/v>|<is><t[^>]*>([^<]*)<\/t><\/is>)?<\/c>/g;
  let m;
  while ((m = cellRe.exec(sheetXml))) {
    const col = colToIndex(m[1]);
    const row = Number(m[2]);
    const attrs = m[3] || "";
    const typeMatch = attrs.match(/t="([^"]+)"/);
    const t = typeMatch ? typeMatch[1] : "";
    let value = "";
    if (m[5] != null) value = decode(m[5]);
    else if (m[4] != null) {
      if (t === "s") value = shared[Number(m[4])] ?? "";
      else value = m[4];
    }
    if (!rows.has(row)) rows.set(row, []);
    rows.get(row)[col] = value;
  }
  return [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([, cells]) => cells);
}

function toObjects(grid) {
  if (!grid.length) return [];
  const headers = (grid[0] || []).map((h) => String(h || "").trim());
  const records = [];
  for (const row of grid.slice(1)) {
    const rec = {};
    let empty = true;
    headers.forEach((h, i) => {
      const v = row[i] == null ? "" : String(row[i]).trim();
      rec[h || `col_${i}`] = v;
      if (v) empty = false;
    });
    if (!empty) records.push(rec);
  }
  return { headers, records };
}

function convertWorkbook(xlsxPath, previewPath) {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), "xlsx-"));
  unzipXlsx(xlsxPath, dest);
  const sharedPath = path.join(dest, "xl", "sharedStrings.xml");
  const shared = fs.existsSync(sharedPath) ? parseSharedStrings(fs.readFileSync(sharedPath, "utf8")) : [];
  const sheetPath = path.join(dest, "xl", "worksheets", "sheet1.xml");
  const sheetXml = fs.readFileSync(sheetPath, "utf8");
  const grid = parseSheet(sheetXml, shared);
  const { headers, records } = toObjects(grid);
  fs.mkdirSync(path.dirname(previewPath), { recursive: true });
  fs.writeFileSync(
    previewPath,
    JSON.stringify({ headers, count: records.length, rows: records.slice(0, 6) }, null, 2),
  );
  const fullPath = previewPath.replace(".preview.json", ".json");
  fs.writeFileSync(fullPath, JSON.stringify(records));
  console.log("file=", path.basename(xlsxPath), "rows=", records.length, "headers=", JSON.stringify(headers));
  fs.rmSync(dest, { recursive: true, force: true });
}

const dir = "c:\\Software Projects";
const match = fs.readdirSync(dir).find((n) => n.toLowerCase().includes("préventifs et correctifs") || n.toLowerCase().includes("preventifs et correctifs") || /maintenances.*correctifs/i.test(n));
if (!match) {
  console.error("xlsx not found, listing:", fs.readdirSync(dir).filter((n) => n.endsWith(".xlsx")));
  process.exit(1);
}
convertWorkbook(path.join(dir, match), path.join("prisma", "data", "maintenances-combinees.preview.json"));
