import type { InterventionDetailVm } from "@/components/interventions/intervention-types";
import { OperationType, type FailureCause, type InterventionType } from "@prisma/client";

import { failureCauseFr, operationTypeFr } from "@/lib/view/gmao-labels";
import { interventionTypeFr } from "@/lib/view/labels";

function esc(s: string | null | undefined): string {
  if (s == null || s === "") return "—";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDateFr(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(new Date(iso));
}

function formatDuration(minutes: number | null): string {
  if (minutes == null) return "—";
  return `${Math.max(0, Math.round(minutes))} min`;
}

const OPERATIONS: OperationType[] = [
  OperationType.REMPLACEMENT,
  OperationType.DIAGNOSTIC,
  OperationType.AMELIORATION,
  OperationType.CONTROLE,
];

const MAINT_TYPES: InterventionType[] = ["CORRECTIVE", "PREVENTIVE"];

const CAUSES: FailureCause[] = [
  "USURE_NORMALE",
  "DEFAUT_UTILISATEUR",
  "DEFAUT_PRODUIT",
  "AUTRE",
];

function checkCell(active: boolean, label: string): string {
  return `<div class="check-row"><span class="check-box">${active ? "☑" : "☐"}</span><span>${esc(label)}</span></div>`;
}

/** HTML imprimable conforme au modèle « Fiche d'intervention Maintenance ». */
export function buildInterventionFicheHtml(detail: InterventionDetailVm): string {
  const tech = detail.technician;
  const nom = tech?.lastName ?? "—";
  const prenom = tech?.firstName ?? "—";

  const operationChecks = OPERATIONS.map((op) => checkCell(detail.operationType === op, operationTypeFr(op))).join("");
  const typeChecks = MAINT_TYPES.map((t) => checkCell(detail.type === t, interventionTypeFr(t))).join("");
  const causeChecks = CAUSES.map((c) => checkCell(detail.failureCause === c, failureCauseFr(c))).join("");

  const minimumPartRows = 4;
  const visibleRows = Math.max(detail.sparePartLines.length, minimumPartRows);
  const partsRows = Array.from({ length: visibleRows }, (_, idx) => {
    const p = detail.sparePartLines[idx];
    return `<tr>
      <td class="parts-cell">${esc(p?.designation ?? "")}</td>
      <td class="parts-cell">${esc(p?.brand ?? "")}</td>
      <td class="parts-cell">${esc(p?.reference ?? "")}</td>
      <td class="parts-cell qty">${p ? p.quantityUsed : ""}</td>
    </tr>`;
  }).join("");

  const signatureBlock = detail.signature?.startsWith("data:image")
    ? `<img src="${detail.signature}" alt="Signature technicien" style="max-height:120px;max-width:280px;object-fit:contain;" />`
    : `<p style="margin:0;font-size:11px;color:#64748b;">Signature non enregistrée</p>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Fiche d'intervention — ${esc(detail.machine.name)}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    @media print {
      html, body { margin: 0; padding: 0; }
      .no-print { display: none; }
    }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; font-size: 14px; line-height: 1.35; }
    .sheet { width: 100%; }
    .topbar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
    .brand { color: #1f76fb; font-weight: 800; font-size: 24px; letter-spacing: .2px; line-height: 1; }
    .service-box { border: 1px solid #64748b; padding: 8px 10px; min-width: 220px; text-align: left; font-size: 14px; }
    .service-label { font-weight: 700; text-transform: uppercase; }
    .title { text-align: center; font-weight: 900; letter-spacing: .5px; font-size: 26px; margin: 4px 0 12px; text-transform: uppercase; }
    .doc-table th, .doc-table td { border: 1px solid #475569; vertical-align: top; }
    .doc-table th { background: #f1f5f9; text-align: center; font-weight: 800; font-size: 14px; padding: 10px 12px; text-transform: uppercase; }
    .doc-table td { padding: 10px 12px; font-size: 14px; min-height: 40px; }
    .inline-label { font-weight: 700; text-transform: uppercase; font-size: 13px; }
    .block-title { border: 1px solid #475569; border-bottom: 0; background: #f8fafc; font-weight: 800; text-transform: uppercase; font-size: 15px; padding: 8px 12px; margin-top: 8px; }
    .text-block { border: 1px solid #475569; padding: 10px 12px; min-height: 80px; white-space: pre-wrap; font-size: 14px; }
    .triple-table th, .triple-table td { border: 1px solid #475569; vertical-align: top; }
    .triple-table th { background: #f1f5f9; text-transform: uppercase; font-size: 14px; padding: 10px 12px; }
    .triple-table td { padding: 10px 12px; height: 122px; }
    .check-row { display: flex; align-items: center; gap: 8px; margin: 3px 0; font-size: 14px; }
    .check-box { width: 16px; text-align: center; font-size: 14px; line-height: 1; }
    .parts-head { margin-top: 6px; font-weight: 800; text-transform: uppercase; font-size: 15px; }
    .parts-table th, .parts-table td { border: 1px solid #475569; }
    .parts-table th { background: #f1f5f9; font-size: 14px; text-transform: uppercase; padding: 10px 12px; }
    .parts-cell { height: 34px; font-size: 14px; padding: 10px 12px; }
    .parts-cell.qty { text-align: center; width: 70px; }
    .footer-row { display: flex; justify-content: space-between; align-items: flex-end; gap: 8px; margin-top: 6px; }
    .time-box { border: 1px solid #475569; padding: 10px 12px; font-size: 14px; min-width: 280px; }
    .signature-wrap { margin-left: auto; width: 300px; }
    .signature-label { border: 1px solid #475569; border-bottom: 0; background: #f8fafc; font-weight: 800; text-transform: uppercase; font-size: 14px; padding: 8px 10px; text-align: center; }
    .signature-box { border: 1px solid #475569; height: 110px; display: flex; align-items: center; justify-content: center; padding: 8px; }
    .signature-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .signature-empty { font-size: 9px; color: #64748b; }
    table { width: 100%; border-collapse: collapse; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="topbar">
      <div class="brand">NutriFish</div>
      <div class="service-box">
        <span class="service-label">Service:</span> MAINTENANCE
      </div>
    </div>
    <div class="title">FICHE D&apos;INTERVENTION MAINTENANCE</div>

    <table class="doc-table">
      <tr>
        <th style="width:28%;">INTERVENANT</th>
        <th style="width:30%;">NOM DE LA MACHINE</th>
        <th style="width:16%;">EMPLACEMENT</th>
        <th style="width:26%;">DATE</th>
      </tr>
      <tr>
        <td>
          <span class="inline-label">NOM:</span> ${esc(nom)}<br />
          <span class="inline-label">PRÉNOM:</span> ${esc(prenom)}
        </td>
        <td>${esc(detail.machine.name)}</td>
        <td>${esc(detail.machine.location)}</td>
        <td>${esc(formatDateFr(detail.date))}</td>
      </tr>
      <tr>
        <th>SECTEUR MAINTENANCE</th>
        <td colspan="3">${esc(detail.sectorMaintenance)}</td>
      </tr>
    </table>

    <div class="block-title">DESCRIPTION DE DYSFONCTIONNEMENT</div>
    <div class="text-block">${esc(detail.failureDescription)}</div>

    <div class="block-title">RAPPORT D&apos;INTERVENTION</div>
    <div class="text-block">${esc(detail.workPerformed)}</div>

    <div class="block-title">DIFFICULTES RENCONTREES</div>
    <div class="text-block">${esc(detail.difficulties)}</div>

    <table class="triple-table" style="margin-top:6px;">
      <tr>
        <th>OPÉRATION</th>
        <th>TYPE DE MAINTENANCE</th>
        <th>CAUSE DE DÉFAILLANCE</th>
      </tr>
      <tr>
        <td>${operationChecks}</td>
        <td>${typeChecks}</td>
        <td>${causeChecks}</td>
      </tr>
    </table>

    <div class="footer-row">
      <div class="time-box"><span class="inline-label">TEMPS D&apos;INTERVENTION:</span> ${esc(formatDuration(detail.durationMinutes))}</div>
      <div class="signature-wrap">
        <div class="signature-label">Signature technicien</div>
        <div class="signature-box">
          ${
            detail.signature?.startsWith("data:image")
              ? `<img src="${detail.signature}" alt="Signature technicien" />`
              : `<span class="signature-empty"></span>`
          }
        </div>
      </div>
    </div>

    <div class="parts-head">PIÈCES DE RECHANGE ET CONSOMMABLES</div>
    <table class="parts-table">
      <thead>
        <tr>
          <th>DÉSIGNATION</th>
          <th>MARQUE</th>
          <th>RÉFÉRENCE</th>
          <th style="width:70px;">QUANTITÉ</th>
        </tr>
      </thead>
      <tbody>${partsRows}</tbody>
    </table>

    <p class="no-print" style="margin-top:8px;text-align:center;font-size:10px;color:#64748b;">
      Pour un rendu sans en-têtes/pieds du navigateur, décochez « En-têtes et pieds de page » dans la boîte d&apos;impression.
    </p>
  </div>
</body>
</html>`;
}

export function openInterventionFichePrint(detail: InterventionDetailVm) {
  const html = buildInterventionFicheHtml(detail);
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const star = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (star?.[1]) return decodeURIComponent(star[1]);
  const plain = header.match(/filename="?([^";]+)"?/i);
  if (plain?.[1]) return plain[1];
  return null;
}

export async function downloadInterventionFicheFromApi(interventionId: string) {
  const res = await fetch(`/api/interventions/${encodeURIComponent(interventionId)}/fiche`, {
    method: "GET",
  });
  if (!res.ok) throw new Error("Téléchargement impossible.");

  const blob = await res.blob();
  const fallbackName = `Fiche_Intervention_${interventionId.slice(0, 8)}.pdf`;
  const filename = filenameFromDisposition(res.headers.get("content-disposition")) ?? fallbackName;
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
