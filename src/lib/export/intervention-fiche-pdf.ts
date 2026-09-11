import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";

import type { InterventionDetailVm } from "@/components/interventions/intervention-types";
import { failureCauseFr, operationTypeFr } from "@/lib/view/gmao-labels";
import { interventionTypeFr } from "@/lib/view/labels";

const BORDER = rgb(0.28, 0.33, 0.39);
const FILL_WHITE = rgb(1, 1, 1);
const FILL_HEADER = rgb(0.94, 0.96, 0.98);
const BRAND_BLUE = rgb(0.12, 0.46, 0.98);

/** Helvetica standard : retire accents/caractères hors WinAnsi pour éviter crash pdf-lib. */
function pdfText(value: string | null | undefined): string {
  if (!value?.trim()) return "-";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/—/g, "-")
    .replace(/[^\x20-\x7E]/g, " ");
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

function fmtDuration(minutes: number | null): string {
  if (minutes == null) return "-";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

const CHECKBOX_SIZE = 10;

/** Case à cocher graphique + libellé (remplace [ ] / [X] textuels). */
function drawCheckboxOption(
  page: PDFPage,
  font: PDFFont,
  x: number,
  y: number,
  label: string,
  checked: boolean,
) {
  const boxY = y - 1;
  page.drawRectangle({
    x,
    y: boxY,
    width: CHECKBOX_SIZE,
    height: CHECKBOX_SIZE,
    color: FILL_WHITE,
    borderColor: BORDER,
    borderWidth: 0.9,
  });

  if (checked) {
    const pad = 2;
    page.drawLine({
      start: { x: x + pad, y: boxY + pad },
      end: { x: x + CHECKBOX_SIZE - pad, y: boxY + CHECKBOX_SIZE - pad },
      thickness: 1.1,
      color: BORDER,
    });
    page.drawLine({
      start: { x: x + CHECKBOX_SIZE - pad, y: boxY + pad },
      end: { x: x + pad, y: boxY + CHECKBOX_SIZE - pad },
      thickness: 1.1,
      color: BORDER,
    });
  }

  page.drawText(label, {
    x: x + CHECKBOX_SIZE + 6,
    y,
    size: 9,
    font,
    color: BORDER,
  });
}

function drawBox(page: PDFPage, x: number, y: number, w: number, h: number, fill = FILL_WHITE) {
  page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    color: fill,
    borderColor: BORDER,
    borderWidth: 0.8,
  });
}

type DrawBoxOpts = { x: number; y: number; w: number; h: number; title: string; value: string };

function drawSectionBox(page: PDFPage, font: PDFFont, bold: PDFFont, opts: DrawBoxOpts) {
  drawBox(page, opts.x, opts.y, opts.w, opts.h, FILL_WHITE);
  drawBox(page, opts.x, opts.y + opts.h - 20, opts.w, 20, FILL_HEADER);
  page.drawText(pdfText(opts.title), { x: opts.x + 6, y: opts.y + opts.h - 14, size: 9.5, font: bold, color: BORDER });

  const lines = pdfText(opts.value).split("\n");
  let textY = opts.y + opts.h - 34;
  for (const line of lines.slice(0, 6)) {
    page.drawText(line.slice(0, 130), { x: opts.x + 6, y: textY, size: 9.5, font, color: BORDER });
    textY -= 12;
  }
}

export async function buildInterventionFichePdf(detail: InterventionDetailVm): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margin = 28;
  const fullWidth = page.getWidth() - margin * 2;
  let y = page.getHeight() - margin;

  page.drawText("NutriFish", { x: margin, y: y - 12, size: 20, font: bold, color: BRAND_BLUE });
  drawBox(page, page.getWidth() - margin - 170, y - 22, 170, 22, FILL_WHITE);
  page.drawText("Service: MAINTENANCE", {
    x: page.getWidth() - margin - 162,
    y: y - 10,
    size: 10.5,
    font: bold,
    color: BORDER,
  });
  y -= 42;

  page.drawText("FICHE D'INTERVENTION MAINTENANCE", {
    x: margin + 70,
    y,
    size: 15,
    font: bold,
    color: BORDER,
  });
  y -= 24;

  const cols = [0.28, 0.3, 0.16, 0.26].map((r) => r * fullWidth);
  const rowH = 36;
  const secH = 28;
  let x = margin;
  const headers = ["INTERVENANT", "NOM DE LA MACHINE", "EMPLACEMENT", "DATE"];

  for (let i = 0; i < cols.length; i += 1) {
    drawBox(page, x, y - 20, cols[i]!, 20, FILL_HEADER);
    page.drawText(headers[i]!, { x: x + 4, y: y - 13, size: 8.5, font: bold, color: BORDER });
    drawBox(page, x, y - 20 - rowH, cols[i]!, rowH, FILL_WHITE);
    x += cols[i]!;
  }

  page.drawText(`NOM: ${pdfText(detail.technician?.lastName)}`, { x: margin + 4, y: y - 32, size: 8.8, font, color: BORDER });
  page.drawText(`PRENOM: ${pdfText(detail.technician?.firstName)}`, { x: margin + 4, y: y - 44, size: 8.8, font, color: BORDER });
  page.drawText(pdfText(detail.machine.name), { x: margin + cols[0]! + 4, y: y - 38, size: 9, font, color: BORDER });
  page.drawText(pdfText(detail.machine.location), { x: margin + cols[0]! + cols[1]! + 4, y: y - 38, size: 9, font, color: BORDER });
  page.drawText(pdfText(fmtDate(detail.date)), {
    x: margin + cols[0]! + cols[1]! + cols[2]! + 4,
    y: y - 38,
    size: 9,
    font,
    color: BORDER,
  });
  y -= 20 + rowH;

  drawBox(page, margin, y - secH, cols[0]!, secH, FILL_HEADER);
  page.drawText("SECTEUR MAINTENANCE", { x: margin + 4, y: y - 14, size: 8.5, font: bold, color: BORDER });
  drawBox(page, margin + cols[0]!, y - secH, fullWidth - cols[0]!, secH, FILL_WHITE);
  page.drawText(pdfText(detail.sectorMaintenance), { x: margin + cols[0]! + 4, y: y - 14, size: 9, font, color: BORDER });
  y -= secH + 10;

  drawSectionBox(page, font, bold, {
    x: margin,
    y: y - 86,
    w: fullWidth,
    h: 86,
    title: "DESCRIPTION DE DYSFONCTIONNEMENT",
    value: detail.failureDescription || "-",
  });
  y -= 94;
  drawSectionBox(page, font, bold, {
    x: margin,
    y: y - 86,
    w: fullWidth,
    h: 86,
    title: "RAPPORT D'INTERVENTION",
    value: detail.workPerformed || "-",
  });
  y -= 94;
  drawSectionBox(page, font, bold, {
    x: margin,
    y: y - 86,
    w: fullWidth,
    h: 86,
    title: "DIFFICULTES RENCONTREES",
    value: detail.difficulties || "-",
  });
  y -= 96;

  const threeW = fullWidth / 3;
  const tripleH = 116;
  drawBox(page, margin, y - tripleH, fullWidth, tripleH, FILL_WHITE);
  page.drawLine({
    start: { x: margin + threeW, y },
    end: { x: margin + threeW, y: y - tripleH },
    thickness: 0.8,
    color: BORDER,
  });
  page.drawLine({
    start: { x: margin + threeW * 2, y },
    end: { x: margin + threeW * 2, y: y - tripleH },
    thickness: 0.8,
    color: BORDER,
  });
  page.drawLine({
    start: { x: margin, y: y - 22 },
    end: { x: margin + fullWidth, y: y - 22 },
    thickness: 0.8,
    color: BORDER,
  });
  page.drawText("OPERATION", { x: margin + 5, y: y - 15, size: 9, font: bold, color: BORDER });
  page.drawText("TYPE DE MAINTENANCE", { x: margin + threeW + 5, y: y - 15, size: 9, font: bold, color: BORDER });
  page.drawText("CAUSE DE DEFAILLANCE", { x: margin + threeW * 2 + 5, y: y - 15, size: 9, font: bold, color: BORDER });

  const opLines = ["REMPLACEMENT", "DIAGNOSTIC", "AMELIORATION", "CONTROLE"] as const;
  const typeLines = ["CORRECTIVE", "PREVENTIVE"] as const;
  const causeLines = ["USURE_NORMALE", "DEFAUT_UTILISATEUR", "DEFAUT_PRODUIT", "AUTRE"] as const;

  for (let i = 0; i < opLines.length; i += 1) {
    const v = opLines[i];
    drawCheckboxOption(page, font, margin + 6, y - 36 - i * 16, pdfText(operationTypeFr(v)), detail.operationType === v);
  }
  for (let i = 0; i < typeLines.length; i += 1) {
    const v = typeLines[i];
    drawCheckboxOption(page, font, margin + threeW + 6, y - 36 - i * 16, pdfText(interventionTypeFr(v)), detail.type === v);
  }
  for (let i = 0; i < causeLines.length; i += 1) {
    const v = causeLines[i];
    drawCheckboxOption(
      page,
      font,
      margin + threeW * 2 + 6,
      y - 36 - i * 16,
      pdfText(failureCauseFr(v)),
      detail.failureCause === v,
    );
  }
  y -= 126;

  drawBox(page, margin, y - 24, 260, 24, FILL_WHITE);
  page.drawText(`TEMPS D'INTERVENTION: ${pdfText(fmtDuration(detail.durationMinutes))}`, {
    x: margin + 6,
    y: y - 15,
    size: 9.5,
    font: bold,
    color: BORDER,
  });

  const sigW = 190;
  drawBox(page, margin + fullWidth - sigW, y - 24, sigW, 24, FILL_HEADER);
  page.drawText("SIGNATURE TECHNICIEN", {
    x: margin + fullWidth - sigW + 24,
    y: y - 15,
    size: 9,
    font: bold,
    color: BORDER,
  });
  drawBox(page, margin + fullWidth - sigW, y - 98, sigW, 74, FILL_WHITE);

  if (detail.signature?.startsWith("data:image/")) {
    try {
      const imgBytes = Uint8Array.from(Buffer.from(detail.signature.split(",")[1] ?? "", "base64"));
      const img = detail.signature.includes("image/png") ? await pdf.embedPng(imgBytes) : await pdf.embedJpg(imgBytes);
      const dims = img.scale(1);
      const maxW = sigW - 10;
      const maxH = 64;
      const ratio = Math.min(maxW / dims.width, maxH / dims.height);
      const w = dims.width * ratio;
      const h = dims.height * ratio;
      page.drawImage(img, {
        x: margin + fullWidth - sigW + (sigW - w) / 2,
        y: y - 98 + (74 - h) / 2,
        width: w,
        height: h,
      });
    } catch {
      // signature invalide : case vide
    }
  }

  y -= 106;
  page.drawText("PIECES DE RECHANGE ET CONSOMMABLES", { x: margin, y, size: 10, font: bold, color: BORDER });
  y -= 6;

  const pCols = [0.42, 0.2, 0.24, 0.14].map((r) => r * fullWidth);
  const headerY = y - 20;
  x = margin;
  const pHeads = ["DESIGNATION", "MARQUE", "REFERENCE", "QUANTITE"];

  for (let i = 0; i < pCols.length; i += 1) {
    drawBox(page, x, headerY, pCols[i]!, 20, FILL_HEADER);
    page.drawText(pHeads[i]!, { x: x + 4, y: headerY + 7, size: 8.5, font: bold, color: BORDER });
    x += pCols[i]!;
  }

  let rowY = headerY - 20;
  const rowCount = Math.max(detail.sparePartLines.length, 4);
  for (let r = 0; r < rowCount; r += 1) {
    x = margin;
    const part = detail.sparePartLines[r];
    const vals = [
      pdfText(part?.designation ?? ""),
      pdfText(part?.brand ?? ""),
      pdfText(part?.reference ?? ""),
      part ? String(part.quantityUsed) : "",
    ];
    for (let c = 0; c < pCols.length; c += 1) {
      drawBox(page, x, rowY, pCols[c]!, 20, FILL_WHITE);
      page.drawText(vals[c]!.slice(0, c === 0 ? 38 : 22), { x: x + 4, y: rowY + 7, size: 8.5, font, color: BORDER });
      x += pCols[c]!;
    }
    rowY -= 20;
  }

  return pdf.save();
}
