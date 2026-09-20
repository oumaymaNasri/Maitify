import ExcelJS from "exceljs";

import {
  EXCEL_MAINTENANCE_FIELDS,
  MAINTENANCE_TYPE_OPTIONS,
  SECTOR_OPTIONS,
} from "@/lib/gmao/excel-maintenance-columns";

function columnLetter(index: number): string {
  let n = index;
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export async function buildMaintenanceImportTemplate(technicians: string[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "NutriFish GMAO Pro";
  workbook.created = new Date();

  const lists = workbook.addWorksheet("Listes", { state: "hidden" });
  lists.getCell("A1").value = "TYPE";
  MAINTENANCE_TYPE_OPTIONS.forEach((v, i) => {
    lists.getCell(`A${i + 2}`).value = v;
  });
  lists.getCell("B1").value = "SECTEUR";
  SECTOR_OPTIONS.forEach((v, i) => {
    lists.getCell(`B${i + 2}`).value = v;
  });
  lists.getCell("C1").value = "INTERVENANT";
  const names = technicians.length ? technicians : ["Équipe de Maintenance"];
  names.forEach((v, i) => {
    lists.getCell(`C${i + 2}`).value = v;
  });

  const sheet = workbook.addWorksheet("Planning maintenance", {
    views: [{ state: "frozen", ySplit: 1 }],
  }) as ExcelJS.Worksheet & {
    dataValidations: {
      add: (range: string, options: ExcelJS.DataValidation) => void;
    };
  };

  EXCEL_MAINTENANCE_FIELDS.forEach((field, index) => {
    const cell = sheet.getCell(1, index + 1);
    cell.value = field.header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B2A5B" } };
    cell.alignment = { vertical: "middle", wrapText: true };
    sheet.getColumn(index + 1).width = Math.min(36, Math.max(16, field.header.length + 4));
  });
  sheet.getRow(1).height = 28;

  const example = [
    "M102",
    "15/01/2026",
    "Journalière",
    "MAINTENANCE",
    names[0],
    "Extrudeuse",
    "Usine NutriFish",
    "",
    "Contrôle",
    "Préventive",
    "",
    "",
    "30",
    "Contrôle visuel OK",
    "",
    "",
    "",
    "",
    "",
  ];
  example.forEach((v, i) => {
    sheet.getCell(2, i + 1).value = v;
  });

  const lastRow = 5000;
  const typeCol = EXCEL_MAINTENANCE_FIELDS.findIndex((f) => f.key === "maintenanceType") + 1;
  const sectorCol = EXCEL_MAINTENANCE_FIELDS.findIndex((f) => f.key === "sectorMaintenance") + 1;
  const techCol = EXCEL_MAINTENANCE_FIELDS.findIndex((f) => f.key === "intervenant") + 1;

  sheet.dataValidations.add(`${columnLetter(typeCol)}2:${columnLetter(typeCol)}${lastRow}`, {
    type: "list",
    allowBlank: true,
    formulae: [`Listes!$A$2:$A$${MAINTENANCE_TYPE_OPTIONS.length + 1}`],
    showErrorMessage: true,
    errorTitle: "Type invalide",
    error: "Choisissez Préventive, Corrective ou Amélioration.",
  });
  sheet.dataValidations.add(`${columnLetter(sectorCol)}2:${columnLetter(sectorCol)}${lastRow}`, {
    type: "list",
    allowBlank: true,
    formulae: [`Listes!$B$2:$B$${SECTOR_OPTIONS.length + 1}`],
    showErrorMessage: true,
    errorTitle: "Secteur invalide",
    error: "Choisissez un secteur de la liste.",
  });
  sheet.dataValidations.add(`${columnLetter(techCol)}2:${columnLetter(techCol)}${lastRow}`, {
    type: "list",
    allowBlank: true,
    formulae: [`Listes!$C$2:$C$${names.length + 1}`],
    showErrorMessage: true,
    errorTitle: "Intervenant invalide",
    error: "Choisissez un intervenant de la liste.",
  });

  const out = await workbook.xlsx.writeBuffer();
  return Buffer.from(out);
}
