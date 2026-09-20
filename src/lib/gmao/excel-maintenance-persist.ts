import { FailureCause, InterventionType, OperationType, TechnicianSpecialty } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  applyExcelMapping,
  type ExcelColumnMapping,
  foldExcelKey,
} from "@/lib/gmao/excel-maintenance-columns";
import { HISTORICAL_CLOSE_THROUGH, interventionIdentityKey, workflowStatusForLog } from "@/lib/gmao/intervention-status";
import { closeOrdersInPeriod, loadExistingInterventionKeys } from "@/lib/gmao/maintenance-catalog-reconcile";
import { syncDailyMaintenanceOrders } from "@/lib/gmao/maintenance-order-from-logs";

const UNNAMED_MACHINE = "(Sans machine — import Excel)";
const DEFAULT_LOCATION = "Usine NutriFish";
const DEFAULT_TECHNICIAN_LABEL = "Équipe de Maintenance";
const IMPORT_SOURCE = "xlsx_ui";

function norm(s: string | undefined): string {
  return (s ?? "").trim().replace(/\s+/g, " ");
}

function parseIntLoose(v: string | undefined): number | null {
  if (!v) return null;
  const m = String(v).match(/[-+]?\d+/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function parseMinutes(v: string | undefined): number | null {
  const s = norm(v);
  if (!s) return null;
  if (/jour|prod|production|hebdo|mois/i.test(s) && !/^\d/.test(s)) return null;
  const m = parseIntLoose(s);
  if (m !== null && m >= 0 && m < 24 * 60 * 14) return m;
  return null;
}

export function parseExcelDate(raw: string | undefined): Date | null {
  const s = norm(raw);
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  if (Number.isFinite(n) && n > 20000 && n < 80000) {
    const epoch = Date.UTC(1899, 11, 30);
    return new Date(epoch + Math.round(n * 86400000));
  }
  const iso = Date.parse(s);
  if (!Number.isNaN(iso)) return new Date(iso);
  const m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})/);
  if (!m) return null;
  let y = Number(m[3]);
  if (String(m[3]).length <= 2) y += y >= 70 ? 1900 : 2000;
  return new Date(Date.UTC(y, Number(m[2]) - 1, Number(m[1])));
}

function interventionTypeFromFr(value: string | undefined): InterventionType {
  const u = foldExcelKey(value);
  if (u.includes("correct")) return InterventionType.CORRECTIVE;
  if (u.includes("amel")) return InterventionType.AMELIORATION;
  return InterventionType.PREVENTIVE;
}

function normalizeSector(raw: string | undefined): string | null {
  const s = norm(raw);
  if (!s) return null;
  const f = foldExcelKey(s);
  if (f.includes("eid") || f.includes("jour")) return "Journalière";
  if (f.includes("poste")) return "Par Poste";
  if (f.includes("prod")) return "C. Production";
  if (f.includes("hebdo")) return "Hebdomadaire";
  if (f.includes("mens")) return "Mensuelle";
  return s;
}

function normalizeService(raw: string | undefined, sector: string | null): string | null {
  const f = foldExcelKey(raw);
  if (f && !f.includes("eid")) {
    if (f.includes("prod")) return "PRODUCTION";
    if (f.includes("maint")) return "MAINTENANCE";
    return norm(raw);
  }
  if (sector === "C. Production") return "PRODUCTION";
  if (sector) return "MAINTENANCE";
  return null;
}

function normalizeTechnicianLabel(raw: string | undefined): string {
  const s = norm(raw);
  const f = foldExcelKey(s);
  if (!s || f.includes("eid")) return DEFAULT_TECHNICIAN_LABEL;
  if ((f.includes("eq") || f.includes("equipe")) && f.includes("maint")) return DEFAULT_TECHNICIAN_LABEL;
  return s;
}

function operationTypeFromFr(value: string | undefined, type: InterventionType): OperationType {
  const u = foldExcelKey(value);
  if (u.includes("remplac")) return OperationType.REMPLACEMENT;
  if (u.includes("amelior")) return OperationType.AMELIORATION;
  if (u.includes("control") || u.includes("net") || u.includes("graiss")) return OperationType.CONTROLE;
  if (type === InterventionType.PREVENTIVE) return OperationType.CONTROLE;
  return OperationType.DIAGNOSTIC;
}

function failureCauseFromFr(causeLie: string | undefined, cause: string | undefined): FailureCause | null {
  const u = `${foldExcelKey(causeLie)} ${foldExcelKey(cause)}`;
  if (u.includes("usure")) return FailureCause.USURE_NORMALE;
  if (u.includes("utilisateur") || u.includes("defaut utilis")) return FailureCause.DEFAUT_UTILISATEUR;
  if (u.includes("defaut prod") || u.includes("fabrication")) return FailureCause.DEFAUT_PRODUIT;
  if (norm(causeLie) || norm(cause)) return FailureCause.AUTRE;
  return null;
}

function splitPersonName(full: string): { firstName: string; lastName: string } {
  const parts = full.split(" ").filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "—" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

export async function persistMappedExcelRows(
  rows: Record<string, string>[],
  mapping: ExcelColumnMapping,
): Promise<{
  inserted: number;
  skipped: number;
  catalogTotal: number;
  om: { days: number; created: number; linked: number };
}> {
  const machines = new Map((await prisma.machine.findMany()).map((m) => [norm(m.name).toLowerCase(), m]));
  const techs = new Map<string, { id: string }>();
  for (const t of await prisma.technician.findMany()) {
    techs.set(norm(`${t.firstName} ${t.lastName}`).toLowerCase(), t);
    if (t.lastName === "—") techs.set(norm(t.firstName).toLowerCase(), t);
  }

  async function resolveMachine(name: string, location: string) {
    const key = (norm(name) || UNNAMED_MACHINE).toLowerCase();
    const loc = norm(location) || DEFAULT_LOCATION;
    const existing = machines.get(key);
    if (existing) return existing;
    const created = await prisma.machine.create({
      data: {
        name: norm(name) || UNNAMED_MACHINE,
        location: loc,
        assetStatus: "OPERATIONAL",
        maintenanceSector: "HEBDOMADAIRE",
      },
    });
    machines.set(key, created);
    return created;
  }

  async function resolveTechnician(label: string) {
    const n = normalizeTechnicianLabel(label);
    const key = n.toLowerCase();
    const hit = techs.get(key);
    if (hit) return hit;
    const { firstName, lastName } = splitPersonName(n);
    const created = await prisma.technician.create({
      data: {
        firstName,
        lastName,
        specialty: TechnicianSpecialty.MECANIQUE,
        role: "TECHNICIEN",
      },
    });
    techs.set(key, created);
    techs.set(norm(`${firstName} ${lastName}`).toLowerCase(), created);
    return created;
  }

  const prepared: {
    machineId: string;
    technicianId: string | null;
    date: Date;
    operationType: OperationType;
    type: InterventionType;
    workflowStatus: ReturnType<typeof workflowStatusForLog>;
    failureDescription: string | null;
    workPerformed: string;
    durationMinutes: number | null;
    failureCause: FailureCause | null;
    importSource: string;
    importMatricule: string | null;
    linkedFailureCause: string | null;
    failureCauseLabel: string | null;
    sparePartsLabel: string | null;
    sectorMaintenance: string | null;
    service: string | null;
    operation: string | null;
    difficulties: string | null;
  }[] = [];

  let skipped = 0;
  for (const raw of rows) {
    const mapped = applyExcelMapping(raw, mapping);
    const date = parseExcelDate(mapped.date);
    if (!date || Number.isNaN(date.getTime()) || date.getTime() === 0) {
      skipped += 1;
      continue;
    }
    const type = interventionTypeFromFr(mapped.maintenanceType);
    const sector = normalizeSector(mapped.sectorMaintenance);
    const machine = await resolveMachine(mapped.machineName, mapped.location);
    const tech = await resolveTechnician(mapped.intervenant);
    const desig = mapped.sparePart;
    const brand = mapped.brand;
    const ref = mapped.reference;
    const qty = parseIntLoose(mapped.quantity);
    const sparePartsLabel = [desig, brand && `Marque: ${brand}`, ref && `Réf: ${ref}`, qty != null && `Qté: ${qty}`]
      .filter(Boolean)
      .join(" · ");

    prepared.push({
      machineId: machine.id,
      technicianId: tech.id,
      date,
      operationType: operationTypeFromFr(mapped.operation, type),
      type,
      workflowStatus: workflowStatusForLog(type, date),
      failureDescription: mapped.failureDescription || null,
      workPerformed: mapped.workPerformed || "(Import Excel — pas de rapport)",
      durationMinutes: parseMinutes(mapped.duration),
      failureCause: failureCauseFromFr(mapped.linkedFailureCause, mapped.failureCause),
      importSource: IMPORT_SOURCE,
      importMatricule: mapped.matricule || null,
      linkedFailureCause: mapped.linkedFailureCause || null,
      failureCauseLabel: mapped.failureCause || null,
      sparePartsLabel: sparePartsLabel || null,
      sectorMaintenance: sector,
      service: normalizeService(mapped.service, sector),
      operation: mapped.operation || null,
      difficulties: mapped.difficulties || null,
    });
  }

  const existingKeys = await loadExistingInterventionKeys(prisma);
  const uniquePrepared: typeof prepared = [];
  for (const row of prepared) {
    const key = interventionIdentityKey(row.machineId, row.date, row.type);
    if (existingKeys.has(key)) {
      skipped += 1;
      continue;
    }
    existingKeys.add(key);
    uniquePrepared.push(row);
  }

  const BATCH = 400;
  let inserted = 0;
  for (let i = 0; i < uniquePrepared.length; i += BATCH) {
    const chunk = uniquePrepared.slice(i, i + BATCH);
    const result = await prisma.maintenanceLog.createMany({ data: chunk });
    inserted += result.count;
  }

  const om = await syncDailyMaintenanceOrders(prisma);
  await closeOrdersInPeriod(prisma, { toDayKey: HISTORICAL_CLOSE_THROUGH });
  const catalogTotal = await prisma.maintenanceLog.count();

  return { inserted, skipped, catalogTotal, om };
}
