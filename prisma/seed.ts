/**
 * Import Access (CSV pré-exporté) vers PostgreSQL / Prisma.
 * 1. npm run access:export
 * 2. IMPORT_CLEAR=1 npm run db:seed   (vide les données importées)
 *
 * Ou : npm run import:access (export + import avec nettoyage)
 */
import fs from "node:fs";
import path from "node:path";

import { parse } from "csv-parse/sync";
import {
  FailureCause,
  InterventionType,
  PrismaClient,
  UserRole,
  WaterZone,
  type Machine,
  type MaintenanceLog,
  type User,
} from "@prisma/client";

const prisma = new PrismaClient();

const EXPORT_DIR = path.join(process.cwd(), "scripts", "access-export");
const SHOULD_CLEAR = process.env.IMPORT_CLEAR === "1";

function loadCsv(filename: string): Record<string, string>[] {
  const p = path.join(EXPORT_DIR, filename);
  if (!fs.existsSync(p)) return [];
  const buf = fs.readFileSync(p, "utf8");
  return parse(buf, {
    columns: true,
    delimiter: ";",
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as Record<string, string>[];
}

function slugEmailPart(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .toLowerCase()
    .slice(0, 48);
}

function parseFrLooseDate(raw: string | undefined): Date | null {
  if (!raw?.trim()) return null;
  const s = raw.trim();
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return new Date(t);
  const m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]) - 1;
  let y = Number(m[3]);
  if (String(m[3]).length <= 2) y += y >= 70 ? 1900 : 2000;
  const hh = Number(m[4] ?? 0);
  const mm = Number(m[5] ?? 0);
  const ss = Number(m[6] ?? 0);
  return new Date(y, mo, d, hh, mm, ss);
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
  const m = parseIntLoose(v);
  if (m !== null && m >= 0) return m;
  if (!v?.trim()) return null;
  const g = String(v).match(/(\d+(?:[.,]\d+)?)/);
  return g ? Math.round(Number(g[1].replace(",", "."))) : null;
}

function norm(s: string | undefined): string {
  return (s ?? "").trim().replace(/\s+/g, " ");
}

function interventionTypeFromFr(value: string | undefined): InterventionType {
  const u = norm(value).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  if (u.includes("prevent")) return InterventionType.PREVENTIVE;
  if (u.includes("amel")) return InterventionType.AMELIORATION;
  if (u.includes("correct")) return InterventionType.CORRECTIVE;
  return InterventionType.CORRECTIVE;
}

function failureCauseFromFr(causeLie: string | undefined, cause: string | undefined): FailureCause | null {
  const u = `${norm(causeLie)} ${norm(cause)}`
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  if (u.includes("usure")) return FailureCause.USURE_NORMALE;
  if (u.includes("utilisateur") || u.includes("defaut utilis")) return FailureCause.DEFAUT_UTILISATEUR;
  if (u.includes("defaut prod") || u.includes("fabrication")) return FailureCause.DEFAUT_PRODUIT;
  if (causeLie || cause) return FailureCause.AUTRE;
  return null;
}

const dedupeSeen = new Set<string>();

async function resolveMachine(
  name: string,
  legacyMatricule: number | null,
  location: string,
  machineByMatricule: Map<number, Machine>,
  machineByNormName: Map<string, Machine>,
): Promise<Machine> {
  const loc = norm(location) || "—";

  if (legacyMatricule !== null && machineByMatricule.has(legacyMatricule)) {
    const m = machineByMatricule.get(legacyMatricule)!;
    if (norm(name).length > norm(m.name).length) {
      const updated = await prisma.machine.update({
        where: { id: m.id },
        data: { name: norm(name), location: loc !== "—" ? loc : m.location },
      });
      machineByMatricule.set(legacyMatricule, updated);
      return updated;
    }
    return m;
  }

  const k = norm(name).toLowerCase();
  if (legacyMatricule === null && machineByNormName.has(k)) {
    const existing = machineByNormName.get(k)!;
    if (loc !== "—" || existing.location === "—") {
      const updated = await prisma.machine.update({
        where: { id: existing.id },
        data: { location: loc !== "—" ? loc : existing.location },
      });
      machineByNormName.set(k, updated);
      return updated;
    }
    return existing;
  }

  const created = await prisma.machine.create({
    data: {
      name: norm(name) || `Machine ${legacyMatricule ?? "sans-nom"}`,
      location: loc,
      legacyMatricule: legacyMatricule ?? undefined,
    },
  });

  if (legacyMatricule !== null) machineByMatricule.set(legacyMatricule, created);
  machineByNormName.set(k, created);
  return created;
}

async function ensureTechnician(name: string | undefined): Promise<User | null> {
  const n = norm(name);
  if (!n) return null;
  const slug = slugEmailPart(n) || "technicien";
  const email = `${slug}+import@access.nutrifish`;
  return prisma.user.upsert({
    where: { email },
    update: { name: n, role: UserRole.TECHNICIEN },
    create: { email, name: n, role: UserRole.TECHNICIEN },
  });
}

async function interventionDedupeInsert(
  data: Omit<Parameters<typeof prisma.maintenanceLog.create>[0]["data"], never>,
  fingerprint: string,
): Promise<MaintenanceLog | null> {
  if (dedupeSeen.has(fingerprint)) return null;
  const created = await prisma.maintenanceLog.create({ data });
  dedupeSeen.add(fingerprint);
  return created;
}

async function findOrCreatePart(params: {
  machineId: string;
  designation: string;
  reference: string | null;
  brand: string | null;
  quantityFallback: number;
}): Promise<{ id: string }> {
  const refKey = params.reference?.trim() ? params.reference.trim() : null;
  const existing =
    refKey !== null
      ? await prisma.sparePart.findFirst({
          where: {
            machineId: params.machineId,
            designation: params.designation,
            reference: refKey,
          },
        })
      : await prisma.sparePart.findFirst({
          where: {
            machineId: params.machineId,
            designation: params.designation,
            reference: null,
          },
        });

  if (existing) {
    return { id: existing.id };
  }

  const created = await prisma.sparePart.create({
    data: {
      machineId: params.machineId,
      designation: params.designation,
      reference: refKey,
      brand: params.brand,
      quantity: params.quantityFallback,
    },
  });

  return { id: created.id };
}

/** Colonnes Access type « TH ... » détectées par nom (accents tolérés) */
/** Première valeur dont le nom de colonne matche une des regexp (insensible accents) */
function pickColumn(row: Record<string, string>, tests: RegExp[]): string | undefined {
  const keys = Object.keys(row);
  for (const t of tests) {
    const hit = keys.find((k) => t.test(k.normalize("NFD").replace(/\p{Diacritic}/gu, "")));
    if (hit) return row[hit];
  }
  return undefined;
}

function zoneFromThColumn(header: string): WaterZone | null {
  const c = header.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^\w\s]/gu, "").toLowerCase().replace(/\s+/g, "");
  if (!c.includes("th")) return null;
  if (c.includes("adou") || c.includes("adousseceur")) return WaterZone.EAU_ADOUC_IE;
  const isBache = c.includes("bach") || c.includes("bache");
  if (isBache && (c.includes("1") || c.includes("neau1"))) return WaterZone.BACHE_1;
  if (isBache && (c.includes("2") || c.includes("neau2"))) return WaterZone.BACHE_2;
  if (c.includes("chaudi")) return WaterZone.EAU_CHAUDIERE;
  return null;
}

async function importInterventionCsv(
  rows: Record<string, string>[],
  importSource: string,
  machineByMatricule: Map<number, Machine>,
  machineByNormName: Map<string, Machine>,
) {
  for (const r of rows) {
    const mat = parseIntLoose(r["matricule"]);
    const machineName =
      norm(r["Nom de la machine"]) ||
      norm(r["OPERATION"]) ||
      norm(r["Opération"]) ||
      "Machine sans nom";
    const machine = await resolveMachine(machineName, mat, norm(r["Emplacement"]), machineByMatricule, machineByNormName);
    const d = parseFrLooseDate(r["date"]);
    const date = d ?? new Date(0);

    const workParts = [
      norm(r["RAPPORT D'INTERVENTION"]) || norm(r['RAPPORT D\'INTERVENTION']),
      norm(r["DIFFICULTES RENCONTREES"]),
      norm(r["Opération"]) || norm(r["OPERATION"]),
      norm(r["service"]),
      norm(r["Secteur Maintenance"]),
      norm(r["PIECE DE RECHANGE ET CONSOMMABLES"]),
    ].filter(Boolean);

    const workPerformed = workParts.join("\n").trim() || "(Import Access — pas de rapport)";

    const failureDescription =
      norm(r["DESCRIPTION DE DYSFONCTIONNEMENT"]) || norm(r["CAUSE DE DEFAILLANCE"]) || null;

    const tech = await ensureTechnician(norm(r["Intervanant"]) || norm(r["Intervenant"]) || "");

    const inter = await interventionDedupeInsert(
      {
        machineId: machine.id,
        date,
        type: interventionTypeFromFr(r["TYPE DE MAINTENANCE"]),
        failureDescription,
        workPerformed,
        durationMinutes: parseMinutes(r["TEMPS D'INTERVENTION"]),
        technicianId: tech?.id,
        failureCause: failureCauseFromFr(r["CAUSE LIE A LA DEFAILLANCE"], r["CAUSE DE DEFAILLANCE"]),
        importSource,
      },
      `${importSource}|${date.toISOString()}|${machine.id}|${failureDescription ?? ""}|${workPerformed.slice(0, 80)}`,
    );

    const ref = norm(r["REFERENCE"]);
    const desig = norm(r["PIECE DE RECHANGE ET CONSOMMABLES"]);
    const qtyStr = norm(r["QUANTITE"]);
    const qty = parseIntLoose(qtyStr) ?? 1;
    if (!inter || (!ref && !desig)) continue;

    const part = await findOrCreatePart({
      machineId: machine.id,
      designation: desig || ref,
      reference: ref || null,
      brand: norm(r["MARQUE"]) || null,
      quantityFallback: 0,
    });

    await prisma.sparePartUsage.create({
      data: { maintenanceLogId: inter.id, sparePartId: part.id, quantityUsed: Math.max(1, qty) },
    });
  }
}

async function importFicheEntretien(
  rows: Record<string, string>[],
  machineByMatricule: Map<number, Machine>,
  machineByNormName: Map<string, Machine>,
) {
  for (const r of rows) {
    const mat = parseIntLoose(r["Matricule"]);
    const machineName = norm(r["Nom de la machine"]) || "Machine sans nom";
    const machine = await resolveMachine(machineName, mat, "—", machineByMatricule, machineByNormName);
    const date = parseFrLooseDate(r["Date"]) ?? new Date(0);
    const tech = await ensureTechnician(norm(r["Nom de Technicien"]));

    const workParts = [
      norm(r["Graissage"]) && `Graissage: ${norm(r["Graissage"])}`,
      norm(r["huile"]) && `Huile: ${norm(r["huile"])}`,
      norm(r["Nettoyage"]) && `Nettoyage: ${norm(r["Nettoyage"])}`,
      norm(r["Pièce de rechange"]) && `Pièce: ${norm(r["Pièce de rechange"])}`,
      norm(r["Qtite"]) && `Quantité: ${norm(r["Qtite"])}`,
      norm(r["Commentaire d'observation"]) || norm(r['Commentaire d\'observation']),
      norm(r["OUI"]),
      norm(r["NON"]),
    ].filter(Boolean) as string[];

    const fp = `${date.toISOString()}|${machine.id}|fiche|${norm(r["Cause de l'arret"])}|${workParts.slice(0, 2).join("|")}`;
    await interventionDedupeInsert(
      {
        machineId: machine.id,
        date,
        type: interventionTypeFromFr(r["Type d'intervention"]),
        failureDescription: norm(r["Cause de l'arret"]) || null,
        workPerformed: workParts.join("\n").trim() || "(Fiche entretien Access)",
        durationMinutes: parseMinutes(r["Durée d'intervention"]),
        technicianId: tech?.id ?? null,
        signature: norm(r["Signature de Technicien"]) || undefined,
        importSource: "fiche_entretien",
      },
      fp,
    );

    const notes = `Import fiche entretien — machine ${machine.name}`;

    for (const [column, raw] of Object.entries(r)) {
      const zone = zoneFromThColumn(column);
      if (!zone) continue;
      const th = parseFloatLoose(raw);
      if (th === null) continue;
      await prisma.waterQualityMeasurement.create({
        data: { zone, measuredAt: date, th, notes },
      });
    }
  }
}

async function importSuiviEau(rows: Record<string, string>[]) {
  for (const r of rows) {
    const date = parseFrLooseDate(pickColumn(r, [/^Date$/i]) ?? r["Date"]) ?? new Date();
    const techId =
      (
        await ensureTechnician(norm(pickColumn(r, [/Nom.*Technicien/i, /Technicien/i]) ?? r["Nom de Technicien"]))
      )?.id ?? null;

    const zones: { zone: WaterZone; thRegex: RegExp }[] = [
      { zone: WaterZone.EAU_ADOUC_IE, thRegex: /TH\s*adou/i },
      { zone: WaterZone.BACHE_1, thRegex: /TH\s*Bache\s*1/i },
      { zone: WaterZone.BACHE_2, thRegex: /TH\s*Bache\s*2/i },
      { zone: WaterZone.EAU_CHAUDIERE, thRegex: /TH\s*Chaudi/i },
      { zone: WaterZone.RETOUR_CONDENSAT, thRegex: /Retour\s*condensat/i },
    ];

    const ph = parseFloatLoose(pickColumn(r, [/^PH$/i]) ?? r["PH"]);
    const conductivity = parseFloatLoose(
      pickColumn(r, [/Conductivit/, /µS\/cm/, /uS\/cm/]) ?? r["Conductivité (μS/cm)"],
    );
    const ta = parseFloatLoose(pickColumn(r, [/^TA\s*\(/]) ?? r["TA (°F)"]);
    const tac = parseFloatLoose(pickColumn(r, [/^TAC\s*\(/]) ?? r["TAC (°F)"]);
    const cl = parseFloatLoose(pickColumn(r, [/Cl\s*\(/]) ?? r["Cl (mg/l)"]);

    const matriculeLbl = norm(pickColumn(r, [/^Matricule$/i, /Matricule/i]) ?? r["Matricule"]);

    for (const z of zones) {
      const thRaw = pickColumn(r, [z.thRegex]);
      const th = parseFloatLoose(thRaw);
      const useGlobals = z.zone === WaterZone.EAU_ADOUC_IE;

      const hasZoneValue = th !== null;
      const hasGlobals = ph !== null || conductivity !== null || ta !== null || tac !== null || cl !== null;

      if (useGlobals) {
        if (!hasGlobals && !hasZoneValue) continue;
      } else {
        if (!hasZoneValue) continue;
      }

      await prisma.waterQualityMeasurement.create({
        data: {
          zone: z.zone,
          measuredAt: date,
          th,
          ph: useGlobals ? ph : null,
          conductivity: useGlobals ? conductivity : null,
          ta: useGlobals ? ta : null,
          tac: useGlobals ? tac : null,
          cl: useGlobals ? cl : null,
          recordedById: techId ?? undefined,
          notes: matriculeLbl ? `Matricule Access: ${matriculeLbl}` : undefined,
        },
      });
    }
  }
}

async function importPieces(rows: Record<string, string>[], machineByMatricule: Map<number, Machine>, machineByNormName: Map<string, Machine>) {
  for (const r of rows) {
    const mat = parseIntLoose(r["matricule"]);
    const machName = norm(r["MACHINE"]) || norm(r["Nom de la machine"]) || "";
    const machine = await resolveMachine(machName || `Machine ${mat ?? "?"}`, mat, "—", machineByMatricule, machineByNormName);
    const designation = norm(r["DESIGNATION"]);
    const referenceRaw = norm(r["REFERENCE"]);
    const reference = referenceRaw || null;
    const qty = parseIntLoose(r["QUANTITE"]) ?? 0;

    const existing =
      reference !== null
        ? await prisma.sparePart.findFirst({ where: { machineId: machine.id, designation, reference } })
        : await prisma.sparePart.findFirst({ where: { machineId: machine.id, designation, reference: null } });

    if (existing) {
      await prisma.sparePart.update({
        where: { id: existing.id },
        data: { brand: norm(r["MARQUE"]) || existing.brand, quantity: qty },
      });
      continue;
    }

    await prisma.sparePart.create({
      data: {
        designation,
        reference,
        brand: norm(r["MARQUE"]) || null,
        quantity: qty,
        machineId: machine.id,
      },
    });
  }
}

async function main() {
  if (!SHOULD_CLEAR) {
    console.warn("[seed] IMPORT_CLEAR≠1 → import incrémental (risque doublons). Réexécutez avec IMPORT_CLEAR=1 pour repartir propre.");
  } else {
    console.log("[seed] Vidage données importables…");
    await prisma.maintenanceAttachment.deleteMany({});
    await prisma.sparePartUsage.deleteMany({});
    await prisma.maintenanceLog.deleteMany({});
    await prisma.gmaoAlert.deleteMany({});
    await prisma.waterQualityMeasurement.deleteMany({});
    await prisma.sparePart.deleteMany({});
    await prisma.machinePhoto.deleteMany({});
    await prisma.machineManual.deleteMany({});
    await prisma.machine.deleteMany({});
    await prisma.user.deleteMany({ where: { email: { endsWith: "@access.nutrifish" } } });
  }

  const machineByMatricule = new Map<number, Machine>();
  const machineByNormName = new Map<string, Machine>();

  console.log("[seed] Historique machines + inventaire comme base équipements…");
  const hist = loadCsv("historique_machine.csv");
  const pieces = loadCsv("liste_pieces.csv");
  const fiches = loadCsv("fiche_intervention_maintenance.csv");
  const tableInt = loadCsv("table_intervention.csv");
  const fichesEntretien = loadCsv("fiche_entretien.csv");
  const eau = loadCsv("suivi_eau.csv");

  for (const r of hist) {
    const nm = norm(r["Nom de la machine"]);
    if (!nm) continue;
    await resolveMachine(nm, null, "—", machineByMatricule, machineByNormName);
  }

  console.log("[seed] Pièces & machines…");
  await importPieces(pieces, machineByMatricule, machineByNormName);

  console.log("[seed] Fiches interventions (Access)…");
  await importInterventionCsv(fiches, "fiche_intervention_maintenance", machineByMatricule, machineByNormName);
  await importInterventionCsv(tableInt, "table_intervention", machineByMatricule, machineByNormName);

  console.log("[seed] Fiches entretien (préventif & TH)…");
  await importFicheEntretien(fichesEntretien, machineByMatricule, machineByNormName);

  console.log("[seed] Suivi qualité de l'eau…");
  await importSuiviEau(eau);

  console.log("[seed] Terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
