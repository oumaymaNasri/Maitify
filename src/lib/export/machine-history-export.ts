import type { MachineHistoryHeader, MachineHistoryRow } from "@/lib/gmao/machine-history-query";
import { interventionTypeFr } from "@/lib/view/labels";
import { machineAssetStatusFr, maintenanceWorkflowStatusFr } from "@/lib/view/machine-labels";

function escapeCsv(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

function machineHistoryExportRows(rows: MachineHistoryRow[]): string[][] {
  const header = [
    "Date de l'intervention",
    "Code/Réf Intervention",
    "Type",
    "Technicien",
    "Description du travail",
    "Statut",
  ];
  const data = rows.map((row) => [
    formatDate(row.date),
    row.referenceCode,
    interventionTypeFr(row.type),
    row.technicianName ?? "—",
    row.description,
    maintenanceWorkflowStatusFr(row.workflowStatus),
  ]);
  return [header, ...data];
}

export function exportMachineHistoryToExcel(
  rows: MachineHistoryRow[],
  filename = "historique-nutrifish.csv",
) {
  const lines = machineHistoryExportRows(rows).map((row) => row.map(escapeCsv).join(";"));
  const bom = "\uFEFF";
  const blob = new Blob([bom + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildMachineHistoryCsv(rows: MachineHistoryRow[]): string {
  const lines = machineHistoryExportRows(rows).map((row) => row.map(escapeCsv).join(";"));
  return `\uFEFF${lines.join("\n")}`;
}

export function exportMachineHistoryToPdf(header: MachineHistoryHeader, rows: MachineHistoryRow[]) {
  const exportRows = machineHistoryExportRows(rows);
  const tableRows = exportRows
    .slice(1)
    .map(
      (r) =>
        `<tr>${r.map((c) => `<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;">${c}</td>`).join("")}</tr>`,
    )
    .join("");
  const headerCells = exportRows[0]!
    .map(
      (h) =>
        `<th style="padding:8px;text-align:left;background:#1F76FB;color:#fff;font-size:11px;font-weight:600;">${h}</th>`,
    )
    .join("");

  const machineLine = `${header.name} — ${header.code} | ${header.location} | ${machineAssetStatusFr(header.assetStatus)}`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Historique maintenance — ${header.name}</title></head><body style="font-family:system-ui,sans-serif;padding:24px;">
<h1 style="color:#1F76FB;font-size:18px;margin:0 0 4px;">NutriFish GMAO — Historique de maintenance</h1>
<p style="color:#334155;font-size:13px;font-weight:600;margin:0 0 4px;">${machineLine}</p>
<p style="color:#64748b;font-size:12px;margin:0 0 16px;">${rows.length} intervention(s) — ${new Date().toLocaleString("fr-FR")}</p>
<table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;"><thead><tr>${headerCells}</tr></thead><tbody>${tableRows}</tbody></table>
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

export function sanitizeMachineExportFilename(name: string): string {
  const cleaned = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_");
  return cleaned.slice(0, 80) || "machine";
}

/** @deprecated Utiliser buildMachineHistoryPdfHtml via exportMachineHistoryToPdf côté client. */
export function buildMachineHistoryPdfHtml(header: MachineHistoryHeader, rows: MachineHistoryRow[]): string {
  const exportRows = machineHistoryExportRows(rows);
  const tableBody = exportRows
    .slice(1)
    .map(
      (row) =>
        `<tr>${row
          .map(
            (cell) =>
              `<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;vertical-align:top;">${cell}</td>`,
          )
          .join("")}</tr>`,
    )
    .join("");
  const tableHead = exportRows[0]!
    .map(
      (h) =>
        `<th style="padding:8px;text-align:left;background:#1F76FB;color:#fff;font-size:11px;font-weight:600;">${h}</th>`,
    )
    .join("");

  const machineLine = `${header.name} — ${header.code} | ${header.location} | ${machineAssetStatusFr(header.assetStatus)}`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Historique maintenance — ${header.name}</title></head>
<body style="font-family:system-ui,sans-serif;padding:24px;">
<h1 style="color:#1F76FB;font-size:18px;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.02em;">NUTRISH PRO GMAO - HISTORIQUE DE MAINTENANCE</h1>
<p style="color:#334155;font-size:13px;font-weight:600;margin:0 0 4px;">${machineLine}</p>
<p style="color:#64748b;font-size:12px;margin:0 0 16px;">${rows.length} intervention(s) — ${new Date().toLocaleString("fr-FR")}</p>
<table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;"><thead><tr>${tableHead}</tr></thead><tbody>${tableBody}</tbody></table>
</body></html>`;
}
