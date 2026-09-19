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

const prisma = new PrismaClient();

const SOURCE_CORRECTIVE = "xlsx_corrective";
const SOURCE_PREVENTIVE = "xlsx_preventive";
const DEFAULT_LOCATION = "Usine NutriFish";
const UNNAMED_MACHINE = "(Sans machine — import Excel)";

type ExcelRow = Record<string, string>;

function loadRows(fileName: string): ExcelRow[] {
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
  console.log(`[seed-maintenances] lu ${rows.length} lignes depuis ${file}`);
  return rows as ExcelRow[];
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

function interventionTypeFromFr(value: string | undefined, fallback: InterventionType): InterventionType {
  const u = norm(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  if (u.includes("prevent")) return InterventionType.PREVENTIVE;
  if (u.includes("amel")) return InterventionType.AMELIORATION;
  if (u.includes("correct")) return InterventionType.CORRECTIVE;
  return fallback;
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
    const type = interventionTypeFromFr(r["TYPE DE MAINTENANCE"], InterventionType.CORRECTIVE);
    const failureDescription = norm(r["DESCRIPTION DE DYSFONCTIONNEMENT"]) || null;
    const rapport = norm(r["RAPPORT D'INTERVENTION"]);
    const tech = await resolveTechnician(r["Intervanant"] || r["Intervenant"], techs);
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
      importSource: SOURCE_CORRECTIVE,
      importMatricule: norm(r["matricule"] || r["Matricule"]) || null,
      linkedFailureCause: norm(r["CAUSE LIE A LA DEFAILLANCE"]) || null,
      failureCauseLabel: norm(r["CAUSE DE DEFAILLANCE"]) || null,
      sparePartsLabel: sparePartsLabel || null,
      sectorMaintenance: norm(r["Secteur Maintenance"]) || null,
      service: norm(r["service"]) || null,
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
    const machine = await resolveMachine(machineName, "", machines);
    const type = interventionTypeFromFr(r["Type d'intervention"], InterventionType.PREVENTIVE);
    const date = parseExcelDate(r["Date"]);
    const workParts = [
      isOui(r["Nettoyage"]) ? "Nettoyage: OUI" : norm(r["Nettoyage"]) && `Nettoyage: ${norm(r["Nettoyage"])}`,
      isOui(r["Graissage"]) ? "Graissage: OUI" : norm(r["Graissage"]) && `Graissage: ${norm(r["Graissage"])}`,
      isOui(r["huile"]) ? "Huile: OUI" : norm(r["huile"]) && `Huile: ${norm(r["huile"])}`,
      norm(r["Pièce de rechange"]) && `Pièce: ${norm(r["Pièce de rechange"])}`,
      norm(r["Qtite"]) && `Quantité: ${norm(r["Qtite"])}`,
      norm(r["Durée d'intervention"]) && `Durée / atelier: ${norm(r["Durée d'intervention"])}`,
    ].filter(Boolean) as string[];
    const tech = await resolveTechnician(r["Nom de Technicien"], techs);
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
      sectorMaintenance: null,
      service: null,
      operation: norm(r["Type d'intervention"]) || null,
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
  const corrective = loadRows("maintenances-correctives.json");
  const preventive = loadRows("maintenances-preventives.json");
  const expected = corrective.length + preventive.length;
  if (expected <= 0) {
    throw new Error("[seed-maintenances] Aucune ligne Excel à importer.");
  }

  const existing = await prisma.maintenanceLog.count({
    where: { importSource: { in: [SOURCE_CORRECTIVE, SOURCE_PREVENTIVE] } },
  });

  const missingMatricule = await prisma.maintenanceLog.count({
    where: { importSource: { in: [SOURCE_CORRECTIVE, SOURCE_PREVENTIVE] }, importMatricule: null },
  });
  const needsEnrichment = missingMatricule > 100;

  if (existing >= expected && !force && !needsEnrichment) {
    console.log(`[seed-maintenances] ${existing} lignes Excel déjà en base (attendu ${expected}).`);
    await syncWorkflowStatuses();
    return;
  }

  if (existing > 0) {
    console.log(
      `[seed-maintenances] import incomplet ou forcé (${existing}/${expected}) — suppression puis réimport…`,
    );
    await prisma.maintenanceLog.deleteMany({
      where: { importSource: { in: [SOURCE_CORRECTIVE, SOURCE_PREVENTIVE] } },
    });
  }

  console.log(`[seed-maintenances] Excel : ${corrective.length} correctives, ${preventive.length} préventives`);

  const machines = await loadMachineIndex();
  const techs = await loadTechnicianIndex();

  const corr = await importCorrective(corrective, machines, techs);
  const prev = await importPreventive(preventive, machines, techs);
  console.log(
    `[seed-maintenances] à insérer telles quelles : ${corr.prepared.length} corr, ${prev.prepared.length} prév`,
  );

  const corrStats = await persistLogs(corr.prepared);
  const prevStats = await persistLogs(prev.prepared);

  const total = await prisma.maintenanceLog.count();
  console.log(`[seed-maintenances] OK correctives créées=${corrStats.created} pièces=${corrStats.parts}`);
  console.log(
    `[seed-maintenances] OK préventives créées=${prevStats.created} pièces=${prevStats.parts} TH=${prevStats.waterCount}`,
  );
  console.log(`[seed-maintenances] total interventions en base=${total}`);
  await syncWorkflowStatuses();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
