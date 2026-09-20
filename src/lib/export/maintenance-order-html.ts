import type { MaintenanceOrderDetailVm } from "@/lib/gmao/maintenance-order-detail-query";
import { formatDateFrShort, formatDurationMinutes } from "@/lib/utils/format-date";
import { interventionTypeFr } from "@/lib/view/labels";
import { maintenanceWorkflowStatusFr } from "@/lib/view/machine-labels";

function esc(s: string | null | undefined): string {
  if (s == null || s === "") return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(iso: string): string {
  return formatDateFrShort(iso);
}

/** Valeur tâche : X si cochée, tiret centré sinon. */
function taskMark(checked: boolean): string {
  return checked
    ? `<span class="task-yes">X</span>`
    : `<span class="task-no">—</span>`;
}

function machineRows(detail: MaintenanceOrderDetailVm): string {
  const typeLabel = interventionTypeFr(detail.interventionType);
  if (detail.lines.length === 0) {
    return `<tr><td colspan="7" class="empty-row">Aucune machine planifiée</td></tr>`;
  }
  return detail.lines
    .map(
      (line) => `<tr>
        <td class="col-machine">${esc(line.machineName)}</td>
        <td class="col-center">${esc(typeLabel)}</td>
        <td class="col-center">${taskMark(line.taskNettoyage)}</td>
        <td class="col-center">${taskMark(line.taskGraissage)}</td>
        <td class="col-center">${taskMark(line.taskHuile)}</td>
        <td class="col-center">${taskMark(line.taskControl)}</td>
        <td class="col-center">${taskMark(line.taskNonConforme)}</td>
      </tr>`,
    )
    .join("");
}

function interventionRows(detail: MaintenanceOrderDetailVm, type: "PREVENTIVE" | "OTHER"): string {
  const logs =
    type === "PREVENTIVE"
      ? detail.logs.filter((l) => l.type === "PREVENTIVE")
      : detail.logs.filter((l) => l.type !== "PREVENTIVE");
  if (logs.length === 0) {
    return `<tr><td colspan="5" class="empty-row">${
      type === "PREVENTIVE" ? "Aucune maintenance préventive" : "Aucune maintenance corrective"
    }</td></tr>`;
  }
  return logs
    .map(
      (log) => `<tr>
        <td class="col-machine">${esc(log.machineName)}</td>
        <td class="col-center">${esc(interventionTypeFr(log.type))}</td>
        <td>${esc(log.technicianName ?? "—")}</td>
        <td class="col-center">${esc(formatDurationMinutes(log.durationMinutes))}</td>
        <td class="col-center">${esc(maintenanceWorkflowStatusFr(log.workflowStatus))}</td>
      </tr>`,
    )
    .join("");
}

/** Document HTML imprimable — modèle officiel FOR-MNT-02 (Ordre de Maintenance). */
export function buildMaintenanceOrderHtml(detail: MaintenanceOrderDetailVm): string {
  const comment = esc(detail.observationComment ?? "") || "—";
  const approval = esc(detail.managerApproval ?? "") || "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Ordre de maintenance — ${esc(detail.reference)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm;
    }
    @media print {
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .no-print { display: none !important; }
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #0f172a;
      background: #fff;
    }
    .page {
      width: 100%;
      max-width: 186mm;
      margin: 0 auto;
      padding: 0;
    }

    /* ——— En-tête cartouche ——— */
    .header-cartouche {
      width: 100%;
      border: 1px solid #64748b;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .header-cartouche td {
      border: 1px solid #64748b;
      vertical-align: middle;
      padding: 10px 12px;
    }
    .header-brand {
      width: 22%;
      font-weight: 800;
      font-size: 20px;
      color: #1f76fb;
      letter-spacing: 0.3px;
    }
    .header-title {
      width: 46%;
      text-align: center;
      font-weight: 800;
      font-size: 17px;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #0f172a;
    }
    .header-meta {
      width: 32%;
      padding: 0 !important;
      vertical-align: top;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    .meta-table td {
      border: 1px solid #64748b;
      border-top: none;
      border-right: none;
      padding: 5px 8px;
    }
    .meta-table tr:first-child td { border-top: none; }
    .meta-table td:last-child { border-right: none; }
    .meta-table .meta-label {
      font-weight: 700;
      width: 38%;
      background: #f8fafc;
      color: #475569;
    }

    /* ——— Barre référence / date ——— */
    .ref-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid #cbd5e1;
      border-top: none;
      padding: 8px 12px;
      font-size: 11px;
      background: #fff;
    }
    .ref-bar strong { font-weight: 700; color: #334155; }

    .section-title {
      margin: 14px 0 0;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #334155;
    }

    /* ——— Tableau machines ——— */
    .machines-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 14px;
      table-layout: fixed;
    }
    .machines-table th,
    .machines-table td {
      border: 1px solid #cbd5e1;
      padding: 8px 6px;
      vertical-align: middle;
    }
    .machines-table thead th {
      background: #f1f5f9;
      font-weight: 700;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #334155;
      text-align: center;
      padding: 10px 6px;
    }
    .col-machine {
      text-align: left;
      font-weight: 600;
      font-size: 11px;
      padding-left: 10px !important;
    }
    .col-center { text-align: center; }
    .task-yes {
      display: inline-block;
      font-weight: 800;
      font-size: 13px;
      color: #0f172a;
      min-width: 18px;
    }
    .task-no {
      color: #94a3b8;
      font-size: 12px;
    }
    .empty-row {
      text-align: center;
      color: #64748b;
      font-style: italic;
      padding: 16px !important;
    }

    /* Colonnes proportionnées */
    .w-machine { width: 28%; }
    .w-type { width: 16%; }
    .w-task { width: 11%; }

    /* ——— Bas de page ——— */
    .footer-grid {
      display: flex;
      gap: 0;
      margin-top: 14px;
      width: 100%;
      min-height: 110px;
    }
    .footer-col {
      width: 50%;
      border: 1px solid #cbd5e1;
      display: flex;
      flex-direction: column;
    }
    .footer-col + .footer-col {
      border-left: none;
    }
    .footer-head {
      background: #f1f5f9;
      border-bottom: 1px solid #cbd5e1;
      padding: 8px 10px;
      font-weight: 700;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #334155;
    }
    .footer-body {
      flex: 1;
      padding: 10px 12px;
      min-height: 88px;
      white-space: pre-wrap;
      font-size: 11px;
      line-height: 1.45;
      color: #0f172a;
    }
    .signature-area {
      margin-top: auto;
      padding-top: 12px;
      border-top: 1px dashed #cbd5e1;
    }
    .signature-label {
      font-size: 10px;
      font-weight: 600;
      color: #64748b;
      margin-bottom: 4px;
    }
    .signature-line {
      font-size: 11px;
      min-height: 28px;
      color: #0f172a;
    }
    .signature-img {
      max-height: 56px;
      max-width: 100%;
      object-fit: contain;
    }

    .print-hint {
      margin-top: 12px;
      font-size: 9px;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="page">
    <table class="header-cartouche" role="presentation">
      <tr>
        <td class="header-brand">NutriFish</td>
        <td class="header-title">Ordre de maintenance</td>
        <td class="header-meta">
          <table class="meta-table" role="presentation">
            <tr>
              <td class="meta-label">Réf</td>
              <td>FOR-MNT-02</td>
            </tr>
            <tr>
              <td class="meta-label">V</td>
              <td>00</td>
            </tr>
            <tr>
              <td class="meta-label">Date d'app.</td>
              <td>01-03-2020</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <div class="ref-bar">
      <span><strong>Référence :</strong> ${esc(detail.reference)}</span>
      <span><strong>Date d'intervention prévue :</strong> ${fmtDate(detail.plannedDate)}</span>
    </div>

    <table class="machines-table">
      <thead>
        <tr>
          <th class="w-machine">Nom de la machine</th>
          <th class="w-type">Type intervention</th>
          <th class="w-task">Nettoyage</th>
          <th class="w-task">Graissage</th>
          <th class="w-task">Huile</th>
          <th class="w-task">C</th>
          <th class="w-task">N.C</th>
        </tr>
      </thead>
      <tbody>
        ${machineRows(detail)}
      </tbody>
    </table>

    <p class="section-title">Interventions préventives du ${fmtDate(detail.plannedDate)}</p>
    <table class="machines-table">
      <thead>
        <tr>
          <th class="w-machine">Machine</th>
          <th class="w-type">Type</th>
          <th>Technicien</th>
          <th class="w-task">Temps</th>
          <th class="w-task">Statut</th>
        </tr>
      </thead>
      <tbody>
        ${interventionRows(detail, "PREVENTIVE")}
      </tbody>
    </table>

    <p class="section-title">Interventions correctives du ${fmtDate(detail.plannedDate)}</p>
    <table class="machines-table">
      <thead>
        <tr>
          <th class="w-machine">Machine</th>
          <th class="w-type">Type</th>
          <th>Technicien</th>
          <th class="w-task">Temps</th>
          <th class="w-task">Statut</th>
        </tr>
      </thead>
      <tbody>
        ${interventionRows(detail, "OTHER")}
      </tbody>
    </table>

    <div class="footer-grid">
      <div class="footer-col">
        <div class="footer-head">Commentaire d'observation</div>
        <div class="footer-body">${comment}</div>
      </div>
      <div class="footer-col">
        <div class="footer-head">Approbation du Directeur</div>
        <div class="footer-body">
          ${approval ? `<div style="margin-bottom:8px;font-weight:600;">${approval}</div>` : ""}
          <div class="signature-area">
            <div class="signature-label">Signature :</div>
            <div class="signature-line"></div>
          </div>
        </div>
      </div>
    </div>

    <p class="print-hint no-print">Pour un PDF sans en-tête navigateur : Imprimer → Destination « Enregistrer au format PDF » → désactiver « En-têtes et pieds de page ».</p>
  </div>
  <script class="no-print">
    window.addEventListener("load", function() {
      setTimeout(function() { window.print(); }, 300);
    });
  </script>
</body>
</html>`;
}

export function openMaintenanceOrderPrint(detail: MaintenanceOrderDetailVm) {
  const html = buildMaintenanceOrderHtml(detail);
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
}

export async function openMaintenanceOrderPrintFromApi(orderId: string) {
  const res = await fetch(`/api/maintenance-orders/${encodeURIComponent(orderId)}/pdf`, {
    method: "GET",
  });
  if (!res.ok) throw new Error("Document introuvable.");
  const html = await res.text();
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
}
