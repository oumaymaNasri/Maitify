import type { StockMovementRow } from "@/lib/gmao/stock-movements-query";
import type { PartInventoryRow } from "@/lib/gmao/stock-parts-query";

function escapeCsv(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadCsv(rows: string[][], filename: string) {
  const lines = rows.map((row) => row.map(escapeCsv).join(";"));
  const bom = "\uFEFF";
  const blob = new Blob([bom + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function printHtmlTable(title: string, subtitle: string, headers: string[], bodyRows: string[][]) {
  const headerCells = headers
    .map(
      (h) =>
        `<th style="padding:8px;text-align:left;background:#1F76FB;color:#fff;font-size:10px;font-weight:600;">${escapeHtml(h)}</th>`,
    )
    .join("");
  const tableRows = bodyRows
    .map(
      (r) =>
        `<tr>${r.map((c) => `<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:10px;">${escapeHtml(c)}</td>`).join("")}</tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title></head><body style="font-family:system-ui,sans-serif;padding:24px;">
<h1 style="color:#1F76FB;font-size:18px;margin:0 0 4px;">${escapeHtml(title)}</h1>
<p style="color:#64748b;font-size:12px;margin:0 0 16px;">${escapeHtml(subtitle)}</p>
<table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;"><thead><tr>${headerCells}</tr></thead><tbody>${tableRows}</tbody></table>
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

function inventoryExportRows(items: PartInventoryRow[]): string[][] {
  const header = ["Désignation", "Marque", "Référence", "Quantité", "Seuil alerte", "Machines", "Statut"];
  const rows = items.map((p) => [
    p.designation,
    p.brand ?? "—",
    p.reference ?? "—",
    String(p.quantity),
    String(p.minStock),
    p.machines.length ? p.machines.map((m) => m.name).join(", ") : "Magasin général",
    p.isLowStock ? "Rupture / Alerte" : "OK",
  ]);
  return [header, ...rows];
}

function movementExportRows(items: StockMovementRow[]): string[][] {
  const header = ["Date", "Pièce", "Marque", "Référence", "Type", "Quantité", "Motif"];
  const rows = items.map((m) => [
    new Date(m.date).toLocaleString("fr-FR"),
    m.partDesignation,
    m.partBrand ?? "—",
    m.partReference ?? "—",
    m.type === "ENTREE" ? "Entrée" : "Sortie",
    String(m.quantity),
    m.motif ?? "—",
  ]);
  return [header, ...rows];
}

export function exportInventoryToExcel(items: PartInventoryRow[], filename = "inventaire-pieces-nutrifish.csv") {
  downloadCsv(inventoryExportRows(items), filename);
}

export function exportInventoryToPdf(items: PartInventoryRow[]) {
  const rows = inventoryExportRows(items);
  printHtmlTable(
    "NutriFish GMAO — Inventaire des Pièces",
    `${items.length} pièce(s) — ${new Date().toLocaleString("fr-FR")}`,
    rows[0]!,
    rows.slice(1),
  );
}

export function exportMovementsToExcel(items: StockMovementRow[], filename = "mouvements-stock-nutrifish.csv") {
  downloadCsv(movementExportRows(items), filename);
}

export function exportMovementsToPdf(items: StockMovementRow[]) {
  const rows = movementExportRows(items);
  printHtmlTable(
    "NutriFish GMAO — Suivi des Mouvements de Stock",
    `${items.length} mouvement(s) — ${new Date().toLocaleString("fr-FR")}`,
    rows[0]!,
    rows.slice(1),
  );
}

export function inventoryToCsvString(items: PartInventoryRow[]): string {
  const bom = "\uFEFF";
  return bom + inventoryExportRows(items).map((row) => row.map(escapeCsv).join(";")).join("\n");
}

export function movementsToCsvString(items: StockMovementRow[]): string {
  const bom = "\uFEFF";
  return bom + movementExportRows(items).map((row) => row.map(escapeCsv).join(";")).join("\n");
}

export function inventoryToHtml(items: PartInventoryRow[]): string {
  const rows = inventoryExportRows(items);
  const headerCells = rows[0]!
    .map(
      (h) =>
        `<th style="padding:8px;text-align:left;background:#1F76FB;color:#fff;font-size:10px;font-weight:600;">${escapeHtml(h)}</th>`,
    )
    .join("");
  const tableRows = rows
    .slice(1)
    .map(
      (r) =>
        `<tr>${r.map((c) => `<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:10px;">${escapeHtml(c)}</td>`).join("")}</tr>`,
    )
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Inventaire des Pièces</title></head><body style="font-family:system-ui,sans-serif;padding:24px;">
<h1 style="color:#1F76FB;font-size:18px;">NutriFish GMAO — Inventaire des Pièces</h1>
<p style="color:#64748b;font-size:12px;">${items.length} pièce(s) — ${new Date().toLocaleString("fr-FR")}</p>
<table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;"><thead><tr>${headerCells}</tr></thead><tbody>${tableRows}</tbody></table>
</body></html>`;
}

export function movementsToHtml(items: StockMovementRow[]): string {
  const rows = movementExportRows(items);
  const headerCells = rows[0]!
    .map(
      (h) =>
        `<th style="padding:8px;text-align:left;background:#1F76FB;color:#fff;font-size:10px;font-weight:600;">${escapeHtml(h)}</th>`,
    )
    .join("");
  const tableRows = rows
    .slice(1)
    .map(
      (r) =>
        `<tr>${r.map((c) => `<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:10px;">${escapeHtml(c)}</td>`).join("")}</tr>`,
    )
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Mouvements de Stock</title></head><body style="font-family:system-ui,sans-serif;padding:24px;">
<h1 style="color:#1F76FB;font-size:18px;">NutriFish GMAO — Suivi des Mouvements de Stock</h1>
<p style="color:#64748b;font-size:12px;">${items.length} mouvement(s) — ${new Date().toLocaleString("fr-FR")}</p>
<table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;"><thead><tr>${headerCells}</tr></thead><tbody>${tableRows}</tbody></table>
</body></html>`;
}
