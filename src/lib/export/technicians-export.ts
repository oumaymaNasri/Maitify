import type { TechnicianRow } from "@/lib/gmao/technicians-query";
import {
  technicianAvailabilityFr,
  technicianRoleFr,
  technicianSpecialtyFr,
} from "@/lib/view/gmao-labels";

function escapeCsv(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

function technicianExportRows(items: TechnicianRow[]): string[][] {
  const header = [
    "Nom",
    "Prénom",
    "Spécialité",
    "Rôle",
    "Statut",
    "E-mail",
    "Téléphone",
    "Matricule",
    "Interventions",
  ];
  const rows = items.map((t) => [
    t.lastName,
    t.firstName,
    technicianSpecialtyFr(t.specialty),
    technicianRoleFr(t.role),
    technicianAvailabilityFr(t.availability),
    t.email ?? "—",
    t.phone ?? "—",
    t.employeeCode ?? "—",
    String(t.interventionCount),
  ]);
  return [header, ...rows];
}

export function exportTechniciansToExcel(items: TechnicianRow[], filename = "techniciens-nutrifish.csv") {
  const lines = technicianExportRows(items).map((row) => row.map(escapeCsv).join(";"));
  const bom = "\uFEFF";
  const blob = new Blob([bom + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function exportTechniciansToPdf(items: TechnicianRow[]) {
  const rows = technicianExportRows(items);
  const tableRows = rows
    .slice(1)
    .map(
      (r) =>
        `<tr>${r.map((c) => `<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:10px;">${escapeHtml(c)}</td>`).join("")}</tr>`,
    )
    .join("");
  const headerCells = rows[0]!
    .map(
      (h) =>
        `<th style="padding:8px;text-align:left;background:#1F76FB;color:#fff;font-size:10px;font-weight:600;">${escapeHtml(h)}</th>`,
    )
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Liste des Techniciens</title></head><body style="font-family:system-ui,sans-serif;padding:24px;">
<h1 style="color:#1F76FB;font-size:18px;margin:0 0 4px;">NutriFish GMAO — Liste des Techniciens</h1>
<p style="color:#64748b;font-size:12px;margin:0 0 16px;">${items.length} profil(s) — ${new Date().toLocaleString("fr-FR")}</p>
<table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;"><thead><tr>${headerCells}</tr></thead><tbody>${tableRows}</tbody></table>
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}
