export const EXCEL_MAINTENANCE_FIELDS = [
  { key: "matricule", header: "matricule", aliases: ["matricule", "mat"] },
  { key: "date", header: "Date", aliases: ["date", "jour", "planned date"] },
  {
    key: "sectorMaintenance",
    header: "Secteur Maintenance",
    aliases: ["secteur maintenance", "secteur", "atelier"],
  },
  { key: "service", header: "service", aliases: ["service"] },
  {
    key: "intervenant",
    header: "Intervanant",
    aliases: ["intervanant", "intervenant", "technicien", "nom de technicien"],
  },
  {
    key: "machineName",
    header: "Nom de la machine",
    aliases: ["nom de la machine", "machine", "equipement"],
  },
  { key: "location", header: "Emplacement", aliases: ["emplacement", "localisation"] },
  {
    key: "failureDescription",
    header: "DESCRIPTION DE DYSFONCTIONNEMENT",
    aliases: ["description de dysfonctionnement", "dysfonctionnement", "cause de l arret"],
  },
  { key: "operation", header: "Opération", aliases: ["operation", "type d intervention"] },
  {
    key: "maintenanceType",
    header: "TYPE DE MAINTENANCE",
    aliases: ["type de maintenance", "type"],
  },
  {
    key: "failureCause",
    header: "CAUSE DE DEFAILLANCE",
    aliases: ["cause de defaillance", "cause"],
  },
  {
    key: "linkedFailureCause",
    header: "CAUSE LIE A LA DEFAILLANCE",
    aliases: ["cause lie a la defaillance", "cause liee"],
  },
  {
    key: "duration",
    header: "TEMPS D'INTERVENTION",
    aliases: ["temps d intervention", "duree d intervention", "duree"],
  },
  {
    key: "workPerformed",
    header: "RAPPORT D'INTERVENTION",
    aliases: ["rapport d intervention", "rapport"],
  },
  {
    key: "difficulties",
    header: "DIFFICULTES RENCONTREES",
    aliases: ["difficultes rencontrees", "difficultes"],
  },
  {
    key: "sparePart",
    header: "PIECE DE RECHANGE ET CONSOMMABLES",
    aliases: ["piece de rechange et consommables", "piece de rechange", "piece"],
  },
  { key: "brand", header: "MARQUE", aliases: ["marque"] },
  { key: "reference", header: "REFERENCE", aliases: ["reference", "ref"] },
  { key: "quantity", header: "QUANTITE", aliases: ["quantite", "qte", "qtite"] },
] as const;

export type ExcelMaintenanceFieldKey = (typeof EXCEL_MAINTENANCE_FIELDS)[number]["key"];

export type ExcelColumnMapping = Record<ExcelMaintenanceFieldKey, string | null>;

export const MAINTENANCE_TYPE_OPTIONS = ["Préventive", "Corrective", "Amélioration"] as const;

export const SECTOR_OPTIONS = [
  "Journalière",
  "Par Poste",
  "C. Production",
  "Hebdomadaire",
  "Mensuelle",
] as const;

export function foldExcelKey(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function suggestExcelMapping(headers: string[]): ExcelColumnMapping {
  const mapping = Object.fromEntries(EXCEL_MAINTENANCE_FIELDS.map((f) => [f.key, null])) as ExcelColumnMapping;
  const used = new Set<string>();

  for (const field of EXCEL_MAINTENANCE_FIELDS) {
    const hit = headers.find((header) => {
      if (used.has(header)) return false;
      const folded = foldExcelKey(header);
      if (!folded) return false;
      return field.aliases.some((alias) => folded === alias || folded.includes(alias));
    });
    if (hit) {
      mapping[field.key] = hit;
      used.add(hit);
    }
  }

  return mapping;
}

export function applyExcelMapping(
  raw: Record<string, string>,
  mapping: ExcelColumnMapping,
): Record<ExcelMaintenanceFieldKey, string> {
  const out = Object.fromEntries(EXCEL_MAINTENANCE_FIELDS.map((f) => [f.key, ""])) as Record<
    ExcelMaintenanceFieldKey,
    string
  >;
  for (const field of EXCEL_MAINTENANCE_FIELDS) {
    const header = mapping[field.key];
    if (!header) continue;
    out[field.key] = (raw[header] ?? "").trim().replace(/\s+/g, " ");
  }
  return out;
}

export function previewMappedRows(rows: Record<string, string>[], mapping: ExcelColumnMapping, limit = 8) {
  return rows.slice(0, limit).map((row) => applyExcelMapping(row, mapping));
}

export function mappingCoverage(mapping: ExcelColumnMapping): { mapped: number; total: number } {
  const mapped = EXCEL_MAINTENANCE_FIELDS.filter((f) => Boolean(mapping[f.key])).length;
  return { mapped, total: EXCEL_MAINTENANCE_FIELDS.length };
}
