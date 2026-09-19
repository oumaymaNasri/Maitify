/**
 * Importe les listes Excel correctives / préventives (JSON extraits).
 * Usage : npm run db:seed:maintenances
 * Réimport : SEED_MAINTENANCES_FORCE=1 npm run db:seed:maintenances
 */
import {
  FailureCause,
  InterventionType,
  OperationType,
  PrismaClient,
  TechnicianSpecialty,
  WaterZone,
  type Machine,
  type Technician,
} from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { startOfTodayTunis, workflowStatusForLog } from "../src/lib/gmao/intervention-status";
import { syncDailyMaintenanceOrders } from "../src/lib/gmao/maintenance-order-from-logs";

const prisma = new PrismaClient();

const SOURCE_COMBINED = "xlsx_combinees_3437";
const SOURCE_PREVENTIVE = "xlsx_preventives_6844";
const EXPECTED_COMBINED_ROWS = 3437;
const EXPECTED_PREVENTIVE_ROWS = 6844;
const DEFAULT_LOCATION = "Usine NutriFish";
const UNNAMED_MACHINE = "(Sans machine — import Excel)";

type ExcelRow = Record<string, string>;

function loadRows(fileName: string, expectedUseful: number): ExcelRow[] {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "data", fileName),
    join(process.cwd(), "prisma", "data", fileName),
  ];
  const file = candidates.find((p) => existsSync(p));
  if (!file) {
    throw new Error(`[seed-maintenances] Fichier introuvable : ${fileName} (cherché ${candidates.join(" | ")})`);
  }
  const raw = JSON.parse(readFileSync(file, "utf8"));
  const rows = Array.isArray(raw) ? raw : Array.isArray(raw?.rows) ? raw.rows : [];
  if (!rows.length) {
    throw new Error(`[seed-maintenances] ${fileName} est vide (${file})`);
  }
  const useful = (rows as ExcelRow[]).filter((r) => Object.values(r).filter((v) => norm(String(v ?? ""))).length >= 2);
  const skipped = rows.length - useful.length;
  console.log(`[seed-maintenances] lu ${rows.length} lignes depuis ${file} (utiles=${useful.length} ignorées=${skipped})`);
  if (useful.length !== expectedUseful) {
    throw new Error(`[seed-maintenances] ${fileName} : attendu ${expectedUseful} lignes utiles, obtenu ${useful.length}`);
  }
  return useful;
}

function norm(s: string | undefined): string {
  return (s ?? "").trim().replace(/\s+/g, " ");
}

function parseIntLoose(v: string | undefined): number | null {
  if (v === undefined || v === null || v === "") return null;
  const m = String(v).match(/[-+]?\d+/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function parseFloatLoose(v: string | undefined): number | null {
  if (!v?.trim()) return null;
  const n = Number(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function parseMinutes(v: string | undefined): number | null {
  const s = norm(v);
  if (!s) return null;
  if (/jour|prod|production|hebdo|mois/i.test(s) && !/^\d/.test(s)) return null;
  const m = parseIntLoose(s);
  if (m !== null && m >= 0 && m < 24 * 60 * 14) return m;
  return null;
}

function parseExcelDate(raw: string | undefined): Date {
  const s = norm(raw);
  if (!s) return new Date(0);
  const n = Number(s.replace(",", "."));
  if (Number.isFinite(n) && n > 20000 && n < 80000) {
    const epoch = Date.UTC(1899, 11, 30);
    return new Date(epoch + Math.round(n * 86400000));
  }
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return new Date(t);
  const m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})/);
  if (!m) return new Date(0);
  let y = Number(m[3]);
  if (String(m[3]).length <= 2) y += y >= 70 ? 1900 : 2000;
  return new Date(Date.UTC(y, Number(m[2]) - 1, Number(m[1])));
}

function isOui(v: string | undefined): boolean | null {
  const u = norm(v)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  if (!u) return null;
  if (u === "oui" || u === "o" || u === "1" || u === "x" || u === "true") return true;
  if (u === "non" || u === "n" || u === "0" || u === "false") return false;
  return null;
}

function foldKey(value: string | undefined): string {
  return norm(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function interventionTypeFromFr(value: string | undefined, fallback: InterventionType): InterventionType {
  const u = foldKey(value);
  if (u.includes("prevent")) return InterventionType.PREVENTIVE;
  if (u.includes("amel")) return InterventionType.AMELIORATION;
  if (u.includes("correct")) return InterventionType.CORRECTIVE;
  return fallback;
}

function combinedInterventionType(value: string | undefined): InterventionType {
  const u = foldKey(value);
  if (!u || u.includes("eid")) return InterventionType.PREVENTIVE;
  return interventionTypeFromFr(value, InterventionType.PREVENTIVE);
}

/** Atelier / fréquence Excel → libellé filtre / graphique. */
function normalizeSector(raw: string | undefined): string | null {
  const s = norm(raw);
  if (!s) return null;
  const f = foldKey(s);
  if (!f) return null;
  if (f.includes("eid") || f.includes("jour")) return "Journalière";
  if (f.includes("poste")) return "Par Poste";
  if (f.includes("prod")) return "C. Production";
  return s;
}

function normalizeService(raw: string | undefined, sector: string | null): string | null {
  const f = foldKey(raw);
  if (f && !f.includes("eid")) {
    if (f.includes("prod")) return "PRODUCTION";
    if (f.includes("maint")) return "MAINTENANCE";
    return norm(raw);
  }
  if (sector === "C. Production") return "PRODUCTION";
  if (sector) return "MAINTENANCE";
  return null;
}

const DEFAULT_TECHNICIAN_LABEL = "Équipe de Maintenance";

function normalizeTechnicianLabel(raw: string | undefined): string {
  const s = norm(raw);
  const f = foldKey(s);
  if (!s || f.includes("eid")) return DEFAULT_TECHNICIAN_LABEL;
  if ((f.includes("eq") || f.includes("equipe")) && f.includes("maint")) return DEFAULT_TECHNICIAN_LABEL;
  return s;
}

function operationTypeFromFr(value: string | undefined, type: InterventionType): OperationType {
  const u = norm(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  if (u.includes("remplac")) return OperationType.REMPLACEMENT;
  if (u.includes("amelior")) return OperationType.AMELIORATION;
  if (u.includes("control") || u.includes("net") || u.includes("graiss")) return OperationType.CONTROLE;
  if (type === InterventionType.PREVENTIVE) return OperationType.CONTROLE;
  return OperationType.DIAGNOSTIC;
}

function failureCauseFromFr(causeLie: string | undefined, cause: string | undefined): FailureCause | null {
  const u = `${norm(causeLie)} ${norm(cause)}`
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  if (u.includes("usure")) return FailureCause.USURE_NORMALE;
  if (u.includes("utilisateur") || u.includes("defaut utilis")) return FailureCause.DEFAUT_UTILISATEUR;
  if (u.includes("defaut prod") || u.includes("fabrication")) return FailureCause.DEFAUT_PRODUIT;
  if (norm(causeLie) || norm(cause)) return FailureCause.AUTRE;
  return null;
}

function splitPersonName(full: string): { firstName: string; lastName: string } {
  const parts = full.split(" ").filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0], lastName: "—" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function zoneFromThColumn(header: string): WaterZone | null {
  const c = header
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\w\s]/gu, "")
    .toLowerCase()
    .replace(/\s+/g, "");
  if (!c.includes("th")) return null;
  if (c.includes("adou") || c.includes("adousseceur")) return WaterZone.EAU_ADOUC_IE;
  const isBache = c.includes("bach") || c.includes("bache");
  if (isBache && (c.includes("1") || c.includes("neau1"))) return WaterZone.BACHE_1;
  if (isBache && (c.includes("2") || c.includes("neau2"))) return WaterZone.BACHE_2;
  if (c.includes("chaudi")) return WaterZone.EAU_CHAUDIERE;
  return null;
}

async function loadMachineIndex(): Promise<Map<string, Machine>> {
  const all = await prisma.machine.findMany();
  const map = new Map<string, Machine>();
  for (const m of all) map.set(norm(m.name).toLowerCase(), m);
  return map;
}

async function resolveMachine(
  name: string,
  location: string,
  cache: Map<string, Machine>,
): Promise<Machine> {
  const key = norm(name).toLowerCase();
  const loc = norm(location) || DEFAULT_LOCATION;
  if (!cache) {
    throw new Error("[seed-maintenances] cache machines manquant");
  }
  const existing = cache.get(key);
  if (existing) {
    if (loc !== DEFAULT_LOCATION && (existing.location === DEFAULT_LOCATION || existing.location === "—")) {
      const updated = await prisma.machine.update({
        where: { id: existing.id },
        data: { location: loc },
      });
      cache.set(key, updated);
      return updated;
    }
    return existing;
  }
  const created = await prisma.machine.create({
    data: {
      name: norm(name),
      location: loc,
      assetStatus: "OPERATIONAL",
      maintenanceSector: "HEBDOMADAIRE",
    },
  });
  cache.set(key, created);
  return created;
}

async function loadTechnicianIndex(): Promise<Map<string, Technician>> {
  const all = await prisma.technician.findMany();
  const map = new Map<string, Technician>();
  for (const t of all) {
    map.set(norm(`${t.firstName} ${t.lastName}`).toLowerCase(), t);
    if (t.lastName === "—") map.set(norm(t.firstName).toLowerCase(), t);
  }
  return map;
}

async function resolveTechnician(name: string | undefined, cache: Map<string, Technician>): Promise<Technician | null> {
  const n = norm(name);
  if (!n) return null;
  const key = n.toLowerCase();
  const hit = cache.get(key);
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
  cache.set(key, created);
  cache.set(norm(`${firstName} ${lastName}`).toLowerCase(), created);
  return created;
}

type PreparedLog = {
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
  signature: string | null;
  importSource: string;
  importMatricule: string | null;
  linkedFailureCause: string | null;
  failureCauseLabel: string | null;
  sparePartsLabel: string | null;
  sectorMaintenance: string | null;
  service: string | null;
  operation: string | null;
  difficulties: string | null;
  preventiveCleaning: boolean | null;
  preventiveLubrication: boolean | null;
  preventiveOil: boolean | null;
  part?: { designation: string; reference: string | null; brand: string | null; qty: number };
  water?: { zone: WaterZone; th: number; measuredAt: Date; notes: string }[];
};

async function importCorrective(rows: ExcelRow[], machines: Map<string, Machine>, techs: Map<string, Technician>) {
  const prepared: PreparedLog[] = [];
  for (const r of rows) {
    const machineName = norm(r["Nom de la machine"]) || UNNAMED_MACHINE;
    const machine = await resolveMachine(machineName, r["Emplacement"], machines);
    const type = combinedInterventionType(r["TYPE DE MAINTENANCE"]);
    const sector = normalizeSector(r["Secteur Maintenance"]);
    const failureDescription = norm(r["DESCRIPTION DE DYSFONCTIONNEMENT"]) || null;
    const rapport = norm(r["RAPPORT D'INTERVENTION"]);
    const tech = await resolveTechnician(normalizeTechnicianLabel(r["Intervanant"] || r["Intervenant"]), techs);
    const desig = norm(r["PIECE DE RECHANGE ET CONSOMMABLES"]);
    const ref = norm(r["REFERENCE"]);
    const brand = norm(r["MARQUE"]);
    const qty = parseIntLoose(r["QUANTITE"]);
    const date = parseExcelDate(r["Date"] || r["date"]);
    const sparePartsLabel = [desig, brand && `Marque: ${brand}`, ref && `Réf: ${ref}`, qty != null && `Qté: ${qty}`]
      .filter(Boolean)
      .join(" · ");
    prepared.push({
      machineId: machine.id,
      technicianId: tech?.id ?? null,
      date,
      operationType: operationTypeFromFr(r["Opération"], type),
      type,
      workflowStatus: workflowStatusForLog(type, date),
      failureDescription,
      workPerformed: rapport || "(Import Excel — pas de rapport)",
      durationMinutes: parseMinutes(r["TEMPS D'INTERVENTION"]),
      failureCause: failureCauseFromFr(r["CAUSE LIE A LA DEFAILLANCE"], r["CAUSE DE DEFAILLANCE"]),
      signature: null,
      importSource: SOURCE_COMBINED,
      importMatricule: norm(r["matricule"] || r["Matricule"]) || null,
      linkedFailureCause: norm(r["CAUSE LIE A LA DEFAILLANCE"]) || null,
      failureCauseLabel: norm(r["CAUSE DE DEFAILLANCE"]) || null,
      sparePartsLabel: sparePartsLabel || null,
      sectorMaintenance: sector,
      service: normalizeService(r["service"], sector),
      operation: norm(r["Opération"]) || null,
      difficulties: norm(r["DIFFICULTES RENCONTREES"]) || null,
      preventiveCleaning: null,
      preventiveLubrication: null,
      preventiveOil: null,
      part: desig || ref
        ? {
            designation: desig || ref,
            reference: ref || null,
            brand: brand || null,
            qty: Math.max(1, qty ?? 1),
          }
        : undefined,
    });
  }
  return { prepared };
}

async function importPreventive(rows: ExcelRow[], machines: Map<string, Machine>, techs: Map<string, Technician>) {
  const prepared: PreparedLog[] = [];
  for (const r of rows) {
    const machineName = norm(r["Nom de la machine"]) || UNNAMED_MACHINE;
    const machine = await resolveMachine(machineName, DEFAULT_LOCATION, machines);
    const type = InterventionType.PREVENTIVE;
    const date = parseExcelDate(r["Date"] || r["date"]);
    const sector = normalizeSector(r["Durée d'intervention"] || r["Secteur Maintenance"] || r["secteur"]);
    const workParts = [
      isOui(r["Nettoyage"]) ? "Nettoyage: OUI" : norm(r["Nettoyage"]) && `Nettoyage: ${norm(r["Nettoyage"])}`,
      isOui(r["Graissage"]) ? "Graissage: OUI" : norm(r["Graissage"]) && `Graissage: ${norm(r["Graissage"])}`,
      isOui(r["huile"]) ? "Huile: OUI" : norm(r["huile"]) && `Huile: ${norm(r["huile"])}`,
      norm(r["Pièce de rechange"]) && `Pièce: ${norm(r["Pièce de rechange"])}`,
      norm(r["Qtite"]) && `Quantité: ${norm(r["Qtite"])}`,
      norm(r["Durée d'intervention"]) && `Durée / atelier: ${norm(r["Durée d'intervention"])}`,
    ].filter(Boolean) as string[];
    const tech = await resolveTechnician(
      normalizeTechnicianLabel(r["Nom de Technicien"] || r["Intervenant"] || r["Intervanant"]),
      techs,
    );
    const water: PreparedLog["water"] = [];
    for (const [column, raw] of Object.entries(r)) {
      const zone = zoneFromThColumn(column);
      if (!zone) continue;
      const th = parseFloatLoose(raw);
      if (th === null) continue;
      water.push({
        zone,
        th,
        measuredAt: date,
        notes: `Import Excel préventif — ${machine.name}`,
      });
    }
    const desig = norm(r["Pièce de rechange"]);
    const sparePartsLabel = [desig, parseIntLoose(r["Qtite"]) != null && `Qté: ${parseIntLoose(r["Qtite"])}`]
      .filter(Boolean)
      .join(" · ");
    prepared.push({
      machineId: machine.id,
      technicianId: tech?.id ?? null,
      date,
      operationType: operationTypeFromFr(r["Type d'intervention"], type),
      type,
      workflowStatus: workflowStatusForLog(type, date),
      failureDescription: norm(r["Cause de l'arret"]) || null,
      workPerformed: workParts.join("\n").trim() || "(Import Excel préventif)",
      durationMinutes: parseMinutes(r["Durée d'intervention"]),
      failureCause: null,
      signature: norm(r["Signature de Technicien"]) || null,
      importSource: SOURCE_PREVENTIVE,
      importMatricule: norm(r["Matricule"] || r["matricule"]) || null,
      linkedFailureCause: null,
      failureCauseLabel: null,
      sparePartsLabel: sparePartsLabel || null,
      sectorMaintenance: sector,
      service: normalizeService(r["service"], sector),
      operation: norm(r["Type d'intervention"]) || "Préventive",
      difficulties: null,
      preventiveCleaning: isOui(r["Nettoyage"]),
      preventiveLubrication: isOui(r["Graissage"]),
      preventiveOil: isOui(r["huile"]),
      part: desig
        ? {
            designation: desig,
            reference: null,
            brand: null,
            qty: Math.max(1, parseIntLoose(r["Qtite"]) ?? 1),
          }
        : undefined,
      water: water.length ? water : undefined,
    });
  }
  return { prepared };
}

async function persistLogs(rows: PreparedLog[]) {
  const BATCH = 500;
  let created = 0;
  let parts = 0;
  let waterCount = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const result = await prisma.maintenanceLog.createMany({
      data: chunk.map((row) => ({
        machineId: row.machineId,
        technicianId: row.technicianId,
        date: row.date,
        operationType: row.operationType,
        type: row.type,
        workflowStatus: row.workflowStatus,
        failureDescription: row.failureDescription,
        workPerformed: row.workPerformed,
        durationMinutes: row.durationMinutes,
        failureCause: row.failureCause,
        signature: row.signature,
        importSource: row.importSource,
        importMatricule: row.importMatricule,
        linkedFailureCause: row.linkedFailureCause,
        failureCauseLabel: row.failureCauseLabel,
        sparePartsLabel: row.sparePartsLabel,
        sectorMaintenance: row.sectorMaintenance,
        service: row.service,
        operation: row.operation,
        difficulties: row.difficulties,
        preventiveCleaning: row.preventiveCleaning,
        preventiveLubrication: row.preventiveLubrication,
        preventiveOil: row.preventiveOil,
      })),
    });
    created += result.count;

    const waters = chunk.flatMap((row) => row.water ?? []);
    if (waters.length) {
      await prisma.waterQualityMeasurement.createMany({
        data: waters.map((w) => ({
          zone: w.zone,
          measuredAt: w.measuredAt,
          th: w.th,
          notes: w.notes,
        })),
      });
      waterCount += waters.length;
    }

    console.log(`[seed-maintenances] ${created}/${rows.length} interventions…`);
  }

  return { created, parts, waterCount };
}

async function repairImportedMetadata(techs: Map<string, Technician>) {
  const defaultTech = await resolveTechnician(DEFAULT_TECHNICIAN_LABEL, techs);
  const jour = await prisma.maintenanceLog.updateMany({
    where: {
      importSource: SOURCE_PREVENTIVE,
      workPerformed: { contains: "Jour.M" },
      OR: [{ sectorMaintenance: null }, { sectorMaintenance: "" }],
    },
    data: {
      type: InterventionType.PREVENTIVE,
      sectorMaintenance: "Journalière",
      service: "MAINTENANCE",
      technicianId: defaultTech.id,
    },
  });
  const prod = await prisma.maintenanceLog.updateMany({
    where: {
      importSource: SOURCE_PREVENTIVE,
      workPerformed: { contains: "C . Production" },
      OR: [{ sectorMaintenance: null }, { sectorMaintenance: "" }],
    },
    data: {
      type: InterventionType.PREVENTIVE,
      sectorMaintenance: "C. Production",
      service: "PRODUCTION",
      technicianId: defaultTech.id,
    },
  });
  const typed = await prisma.maintenanceLog.updateMany({
    where: { importSource: SOURCE_PREVENTIVE, NOT: { type: InterventionType.PREVENTIVE } },
    data: { type: InterventionType.PREVENTIVE },
  });
  const techsMissing = await prisma.maintenanceLog.updateMany({
    where: { importSource: SOURCE_PREVENTIVE, technicianId: null },
    data: { technicianId: defaultTech.id },
  });
  const holiday = await prisma.maintenanceLog.updateMany({
    where: {
      importSource: SOURCE_COMBINED,
      OR: [{ sectorMaintenance: { contains: "Eid" } }, { operation: { contains: "Eid" } }],
    },
    data: {
      type: InterventionType.PREVENTIVE,
      sectorMaintenance: "Journalière",
      service: "MAINTENANCE",
      technicianId: defaultTech.id,
    },
  });
  const emptyCombined = await prisma.maintenanceLog.updateMany({
    where: {
      importSource: SOURCE_COMBINED,
      OR: [{ sectorMaintenance: null }, { sectorMaintenance: "" }],
    },
    data: {
      type: InterventionType.PREVENTIVE,
      sectorMaintenance: "Journalière",
      service: "MAINTENANCE",
      technicianId: defaultTech.id,
    },
  });
  console.log(
    `[seed-maintenances] métadonnées : prév Jour.M=${jour.count} prév Production=${prod.count} type prév=${typed.count} tech prév=${techsMissing.count} eid=${holiday.count} combinées vides=${emptyCombined.count}`,
  );
}

async function syncWorkflowStatuses() {
  const start = startOfTodayTunis();
  const closedOthers = await prisma.maintenanceLog.updateMany({
    where: { type: { not: "PREVENTIVE" } },
    data: { workflowStatus: "COMPLETED" },
  });
  const closedPastPrev = await prisma.maintenanceLog.updateMany({
    where: { type: "PREVENTIVE", date: { lte: start } },
    data: { workflowStatus: "COMPLETED" },
  });
  const openFuturePrev = await prisma.maintenanceLog.updateMany({
    where: { type: "PREVENTIVE", date: { gt: start } },
    data: { workflowStatus: "OPEN" },
  });
  console.log(
    `[seed-maintenances] statuts : clôturées non-prév=${closedOthers.count} prév passées=${closedPastPrev.count} à faire=${openFuturePrev.count}`,
  );
}

async function main() {
  const force = process.env.SEED_MAINTENANCES_FORCE === "1";
  const combinedRows = loadRows("maintenances-combinees.json", EXPECTED_COMBINED_ROWS);
  const preventiveRows = loadRows("maintenances-preventives.json", EXPECTED_PREVENTIVE_ROWS);
  const expected = combinedRows.length + preventiveRows.length;

  const [existingCombined, existingPreventive] = await Promise.all([
    prisma.maintenanceLog.count({ where: { importSource: SOURCE_COMBINED } }),
    prisma.maintenanceLog.count({ where: { importSource: SOURCE_PREVENTIVE } }),
  ]);

  if (existingCombined === combinedRows.length && existingPreventive === preventiveRows.length && !force) {
    console.log(
      `[seed-maintenances] déjà en base : combinées=${existingCombined} préventives=${existingPreventive} total=${existingCombined + existingPreventive}. Conservé.`,
    );
    const techs = await loadTechnicianIndex();
    await repairImportedMetadata(techs);
    await syncWorkflowStatuses();
    const om = await syncDailyMaintenanceOrders(prisma);
    console.log(`[seed-maintenances] OM journaliers : jours=${om.days} créés=${om.created} liés=${om.linked}`);
    return;
  }

  const before = await prisma.maintenanceLog.count();
  console.log(`[seed-maintenances] suppression de ${before} interventions existantes…`);
  await prisma.maintenanceLog.deleteMany({});

  console.log(`[seed-maintenances] Excel combiné=${combinedRows.length} préventives 2026=${preventiveRows.length}`);

  const machines = await loadMachineIndex();
  const techs = await loadTechnicianIndex();
  const mappedCombined = await importCorrective(combinedRows, machines, techs);
  const mappedPreventive = await importPreventive(preventiveRows, machines, techs);
  const prepared = [...mappedCombined.prepared, ...mappedPreventive.prepared];
  console.log(`[seed-maintenances] à insérer : ${prepared.length} (attendu ${expected})`);

  const stats = await persistLogs(prepared);
  const total = await prisma.maintenanceLog.count();
  console.log(`[seed-maintenances] OK créées=${stats.created} total=${total} (attendu ${expected})`);
  await repairImportedMetadata(techs);
  await syncWorkflowStatuses();
  const om = await syncDailyMaintenanceOrders(prisma);
  console.log(`[seed-maintenances] OM journaliers : jours=${om.days} créés=${om.created} liés=${om.linked}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
