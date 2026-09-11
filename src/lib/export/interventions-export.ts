import type { InterventionListVm } from "@/components/interventions/intervention-types";
import { operationTypeFr } from "@/lib/view/gmao-labels";
import { maintenanceWorkflowStatusFr } from "@/lib/view/machine-labels";

function escapeCsv(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

function interventionExportRows(items: InterventionListVm[]): string[][] {
  const header = [
    "Date",
    "Machine",
    "Emplacement",
    "Technicien",
    "Opération",
    "Statut",
    "Durée (min)",
    "Dysfonctionnement",
    "Travaux réalisés",
  ];
  const rows = items.map((r) => [
    formatDate(r.date),
    r.machineName,
    r.machineLocation,
    r.technicianName ?? "—",
    operationTypeFr(r.operationType),
    maintenanceWorkflowStatusFr(r.workflowStatus),
    r.durationMinutes != null ? String(r.durationMinutes) : "—",
    r.failureDescription ?? "—",
    r.workPerformed,
  ]);
  return [header, ...rows];
}

export function exportInterventionsToExcel(items: InterventionListVm[], filename = "liste-maintenance-nutrifish.csv") {
  const lines = interventionExportRows(items).map((row) => row.map(escapeCsv).join(";"));
  const bom = "\uFEFF";
  const blob = new Blob([bom + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportInterventionsToPdf(items: InterventionListVm[]) {
  const rows = interventionExportRows(items);
  const tableRows = rows
    .slice(1)
    .map(
      (r) =>
        `<tr>${r.map((c) => `<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:10px;vertical-align:top;">${escapeHtml(c)}</td>`).join("")}</tr>`,
    )
    .join("");
  const headerCells = rows[0]!
    .map(
      (h) =>
        `<th style="padding:8px;text-align:left;background:#1F76FB;color:#fff;font-size:10px;font-weight:600;">${escapeHtml(h)}</th>`,
    )
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Liste de Maintenance</title></head><body style="font-family:system-ui,sans-serif;padding:24px;">
<h1 style="color:#1F76FB;font-size:18px;margin:0 0 4px;">NutriFish GMAO — Liste de Maintenance</h1>
<p style="color:#64748b;font-size:12px;margin:0 0 16px;">${items.length} intervention(s) — ${new Date().toLocaleString("fr-FR")}</p>
<table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;"><thead><tr>${headerCells}</tr></thead><tbody>${tableRows}</tbody></table>
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
