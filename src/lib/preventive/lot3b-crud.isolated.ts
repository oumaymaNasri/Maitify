/**
 * Lot 3B — CRUD réel sur base isolée UNIQUEMENT.
 * Refus si DATABASE_URL pointe vers `nutrifish_gmao` (sans restore_).
 *
 * Exécution :
 *   DATABASE_URL=...restore_... npx tsx src/lib/preventive/lot3b-crud.isolated.ts
 */
import { createHash, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

import { canManage } from "@/lib/auth/session";
import { computeOccurrences } from "@/lib/preventive/compute-occurrences";
import { preventivePlanCreateSchema } from "@/lib/validations/preventive-plan";

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];

function assert(name: string, ok: boolean, detail?: string) {
  checks.push({ name, ok, detail });
  console.log(`[${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) throw new Error(`Échec: ${name}`);
}

function dbNameFromUrl(url: string): string {
  return new URL(url).pathname.replace(/^\//, "").split("?")[0] ?? "";
}

function cuidLike(prefix: string): string {
  return `${prefix}_${createHash("sha1").update(randomBytes(16)).digest("hex").slice(0, 24)}`;
}

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL manquant");

  const parsed = new URL(url);
  const dbName = dbNameFromUrl(url);
  console.log(`Cible DB (sans secret): host=${parsed.hostname} port=${parsed.port} db=${dbName}`);

  if (dbName === "nutrifish_gmao") {
    throw new Error("REFUS: base principale nutrifish_gmao interdite pour ce script.");
  }
  if (!dbName.startsWith("nutrifish_gmao_restore_")) {
    throw new Error(`REFUS: base inattendue "${dbName}" (attendu préfixe nutrifish_gmao_restore_).`);
  }

  const prisma = new PrismaClient({ datasources: { db: { url } }, log: ["error"] });

  try {
    const typeId = cuidLike("mtype_lot3b");
    const type = await prisma.maintenanceType.create({
      data: {
        id: typeId,
        code: `LOT3B_${Date.now().toString(36).toUpperCase()}`,
        label: "Type test Lot 3B",
        description: "Créé uniquement sur base isolée",
        defaultDurationMin: 30,
        status: "ACTIVE",
      },
    });
    assert("1.create_maintenance_type", type.id === typeId, type.code);

    const machine = await prisma.machine.findFirst({ select: { id: true, name: true } });
    const tech = await prisma.technician.findFirst({
      select: { id: true, firstName: true, lastName: true },
    });
    assert("1b.machine_exists", !!machine, machine?.name);
    assert("1c.technician_exists", !!tech, tech ? `${tech.firstName} ${tech.lastName}` : undefined);

    const startDate = new Date("2026-11-23T00:00:00.000Z");
    const createPayload = {
      machineId: machine!.id,
      maintenanceTypeId: type.id,
      title: "Plan Lot3B hebdo fixe",
      description: "Test isolé",
      instructions: "Contrôle test",
      frequency: "WEEKLY" as const,
      occurrencesPerPeriod: 2,
      scheduleMode: "FIXED" as const,
      includeSunday: false,
      sundayPolicy: "NEXT_MONDAY" as const,
      startDate,
      endDate: null,
      estimatedDurationMin: 45,
      assigneeTechnicianId: tech!.id,
      status: "ACTIVE" as const,
      defaultTimes: [] as string[],
      generationHorizonDays: 30,
      scheduleRules: [
        { sortOrder: 0, weekday: 1, monthDay: null, month: null, timeLocal: "08:00" },
        { sortOrder: 1, weekday: 4, monthDay: null, month: null, timeLocal: "14:30" },
      ],
    };
    const zodOk = preventivePlanCreateSchema.safeParse(createPayload);
    assert(
      "1d.zod_create_valid",
      zodOk.success,
      zodOk.success ? undefined : JSON.stringify(zodOk.error.flatten()),
    );

    const planId = cuidLike("plan_lot3b");
    const plan = await prisma.preventiveMaintenancePlan.create({
      data: {
        id: planId,
        machineId: createPayload.machineId,
        maintenanceTypeId: createPayload.maintenanceTypeId,
        title: createPayload.title,
        description: createPayload.description,
        instructions: createPayload.instructions,
        frequency: createPayload.frequency,
        occurrencesPerPeriod: createPayload.occurrencesPerPeriod,
        scheduleMode: createPayload.scheduleMode,
        includeSunday: createPayload.includeSunday,
        sundayPolicy: createPayload.sundayPolicy,
        startDate: createPayload.startDate,
        estimatedDurationMin: createPayload.estimatedDurationMin,
        assigneeTechnicianId: createPayload.assigneeTechnicianId,
        status: createPayload.status,
        defaultTimes: [],
        generationHorizonDays: 30,
        version: 1,
        scheduleRules: {
          create: createPayload.scheduleRules.map((r) => ({
            sortOrder: r.sortOrder,
            weekday: r.weekday,
            timeLocal: r.timeLocal,
          })),
        },
        revisions: {
          create: {
            version: 1,
            snapshot: createPayload as object,
            changeSummary: "Création initiale Lot3B",
          },
        },
      },
      include: { scheduleRules: true, revisions: true },
    });
    assert("2.create_plan", plan.id === planId);
    assert("3.schedule_rules_count", plan.scheduleRules.length === 2, String(plan.scheduleRules.length));

    const read = await prisma.preventiveMaintenancePlan.findUnique({
      where: { id: planId },
      include: {
        scheduleRules: { orderBy: { sortOrder: "asc" } },
        maintenanceType: true,
        machine: true,
      },
    });
    assert("4.read_plan", !!read && read.title === createPayload.title && read.maintenanceType.code === type.code);

    await prisma.$transaction(async (tx) => {
      await tx.maintenanceScheduleRule.deleteMany({ where: { planId } });
      await tx.preventiveMaintenancePlan.update({
        where: { id: planId },
        data: {
          title: "Plan Lot3B modifié",
          occurrencesPerPeriod: 1,
          version: 2,
          scheduleRules: {
            create: [{ sortOrder: 0, weekday: 2, timeLocal: "09:15" }],
          },
        },
      });
      await tx.preventivePlanRevision.create({
        data: {
          planId,
          version: 2,
          snapshot: { title: "Plan Lot3B modifié" },
          changeSummary: "Modification Lot3B",
        },
      });
    });
    const afterUpdate = await prisma.preventiveMaintenancePlan.findUnique({
      where: { id: planId },
      include: { scheduleRules: true },
    });
    assert(
      "5.update_plan",
      !!afterUpdate &&
        afterUpdate.title === "Plan Lot3B modifié" &&
        afterUpdate.version === 2 &&
        afterUpdate.scheduleRules.length === 1,
    );

    await prisma.preventiveMaintenancePlan.update({ where: { id: planId }, data: { status: "SUSPENDED" } });
    assert(
      "6.suspend_plan",
      (await prisma.preventiveMaintenancePlan.findUnique({ where: { id: planId } }))?.status === "SUSPENDED",
    );

    await prisma.preventiveMaintenancePlan.update({ where: { id: planId }, data: { status: "ACTIVE" } });
    assert(
      "7.reactivate_plan",
      (await prisma.preventiveMaintenancePlan.findUnique({ where: { id: planId } }))?.status === "ACTIVE",
    );

    const revisions = await prisma.preventivePlanRevision.findMany({
      where: { planId },
      orderBy: { version: "asc" },
    });
    assert(
      "8.revision_history",
      revisions.length === 2 && revisions[0]!.version === 1 && revisions[1]!.version === 2,
      `count=${revisions.length}`,
    );

    const occBefore = await prisma.maintenanceOccurrence.count({ where: { planId } });
    const preview = computeOccurrences(
      {
        planId,
        planVersion: 2,
        status: "ACTIVE",
        frequency: "WEEKLY",
        occurrencesPerPeriod: 1,
        scheduleMode: "FIXED",
        includeSunday: false,
        sundayPolicy: "NEXT_MONDAY",
        startDate: "2026-11-23",
        endDate: null,
        timezone: "Africa/Tunis",
        defaultTimes: [],
        scheduleRules: [{ sortOrder: 0, weekday: 2, timeLocal: "09:15" }],
      },
      { from: "2026-11-23", to: "2026-12-22" },
    );
    const occAfter = await prisma.maintenanceOccurrence.count({ where: { planId } });
    assert("9.preview_engine", preview.occurrences.length > 0, `n=${preview.occurrences.length}`);
    assert("9b.preview_no_write", occBefore === 0 && occAfter === 0, `before=${occBefore} after=${occAfter}`);

    assert(
      "10.auth_tech_denied",
      canManage({
        name: "Tech",
        email: "tech@example.tn",
        role: "TECHNICIEN",
        permissions: ["INTERVENIR"],
      }) === false,
    );
    assert(
      "10b.auth_manager_ok",
      canManage({
        name: "Dir",
        email: "dir@example.tn",
        role: "RESPONSABLE",
        permissions: ["ALL"],
      }) === true,
    );
    assert(
      "10c.auth_admin_ok",
      canManage({
        name: "Admin",
        email: "admin@example.tn",
        role: "ADMIN",
        permissions: ["ALL"],
      }) === true,
    );

    const probe = await prisma.$queryRaw`SELECT 1 AS ok FROM "MaintenanceType" LIMIT 1`;
    assert("11.persistence_probe", Array.isArray(probe) && probe.length === 1);

    assert("12.data_integrity_machines", (await prisma.machine.count()) === 83);
    // Table SQL "Intervention" = modèle Prisma MaintenanceLog
    assert("12b.data_integrity_interventions", (await prisma.maintenanceLog.count()) === 11921);

    console.log("\n=== RÉSUMÉ CRUD ISOLÉ ===");
    console.log(`Passés: ${checks.filter((c) => c.ok).length}/${checks.length}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
