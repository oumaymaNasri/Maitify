import ExcelJS from "exceljs";

function cellToString(value: ExcelJS.CellValue): string {
  if (value == null || value === "") return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${d}/${m}/${y}`;
  }
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    if (typeof rec.text === "string") return rec.text.trim();
    if (Array.isArray(rec.richText)) {
      return rec.richText.map((t) => (typeof t === "object" && t && "text" in t ? String(t.text) : "")).join("").trim();
    }
    if ("result" in rec) return cellToString(rec.result as ExcelJS.CellValue);
  }
  return String(value).trim();
}

export async function parseMaintenanceWorkbook(buffer: ArrayBuffer | Buffer): Promise<{
  headers: string[];
  rows: Record<string, string>[];
  skippedEmpty: number;
}> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as never);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("Le fichier Excel ne contient aucune feuille.");

  const headerIndex = new Map<number, string>();
  const headers: string[] = [];
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, col) => {
    const label = cellToString(cell.value);
    if (!label) return;
    headerIndex.set(col, label);
    headers.push(label);
  });

  if (headers.length < 3) {
    throw new Error("Impossible de lire les en-têtes (ligne 1). Vérifiez le modèle Excel.");
  }

  const rows: Record<string, string>[] = [];
  let skippedEmpty = 0;
  const last = sheet.rowCount;

  for (let r = 2; r <= last; r += 1) {
    const row = sheet.getRow(r);
    const record: Record<string, string> = {};
    let filled = 0;
    headerIndex.forEach((header, col) => {
      const text = cellToString(row.getCell(col).value);
      if (text) {
        record[header] = text;
        filled += 1;
      }
    });
    if (filled < 2) {
      skippedEmpty += 1;
      continue;
    }
    rows.push(record);
  }

  return { headers, rows, skippedEmpty };
}
