import { machineAssetStatusFr, formatLastIntervention } from "@/lib/view/machine-labels";
import { maintenanceFrequencyFr } from "@/lib/view/gmao-labels";
import type { MachineCardVm } from "@/components/machines/machine-card";

function escapeCsv(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

function machineExportRows(machines: MachineCardVm[]): string[][] {
  const header = [
    "Nom",
    "Emplacement",
    "Matricule",
    "Statut",
    "Fréquence",
    "Dispo. cible",
    "Interventions",
    "Dernière intervention",
  ];
  const rows = machines.map((m) => [
    m.name,
    m.location,
    m.legacyMatricule != null ? String(m.legacyMatricule) : m.id.slice(0, 8),
    machineAssetStatusFr(m.assetStatus),
    maintenanceFrequencyFr(m.maintenanceSector),
    m.targetAvailability != null ? `${Math.round(m.targetAvailability * 100)}%` : "—",
    String(m.interventionCount),
    formatLastIntervention(m.lastInterventionAt),
  ]);
  return [header, ...rows];
}

export function exportMachinesToExcel(machines: MachineCardVm[], filename = "machines-nutrifish.csv") {
  const lines = machineExportRows(machines).map((row) => row.map(escapeCsv).join(";"));
  const bom = "\uFEFF";
  const blob = new Blob([bom + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportMachinesToPdf(machines: MachineCardVm[]) {
  const rows = machineExportRows(machines);
  const tableRows = rows
    .slice(1)
    .map(
      (r) =>
        `<tr>${r.map((c) => `<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;">${c}</td>`).join("")}</tr>`,
    )
    .join("");
  const headerCells = rows[0]!
    .map(
      (h) =>
        `<th style="padding:8px;text-align:left;background:#1F76FB;color:#fff;font-size:11px;font-weight:600;">${h}</th>`,
    )
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Liste des machines</title></head><body style="font-family:system-ui,sans-serif;padding:24px;">
<h1 style="color:#1F76FB;font-size:18px;margin:0 0 4px;">NutriFish GMAO — Liste des machines</h1>
<p style="color:#64748b;font-size:12px;margin:0 0 16px;">${machines.length} équipement(s) — ${new Date().toLocaleString("fr-FR")}</p>
<table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;"><thead><tr>${headerCells}</tr></thead><tbody>${tableRows}</tbody></table>
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}
