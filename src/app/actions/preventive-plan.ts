"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache/tags";
import {
  generateAllPreventiveOrders,
  generatePreventiveOrdersForPlan,
  resetFuturePlanOccurrences,
  type GenerationResult,
} from "@/lib/preventive/generate-orders";

import { requireManageAction } from "@/lib/auth/session-server";
import type { SessionUser } from "@/lib/auth/session";
import {
  isPreventivePersistenceReady,
  PERSISTENCE_DISABLED_MESSAGE,
  PERSISTENCE_WRITE_BLOCKED_CODE,
} from "@/lib/preventive/persistence";
import { preventivePlanCreateSchema, preventivePlanUpdateSchema } from "@/lib/validations/preventive-plan";
import { prisma } from "@/lib/db/prisma";
import type { PreventivePlanStatus } from "@prisma/client";

export type PreventivePlanActionResult =
  | { ok: true; id: string; warning?: string }
  | { ok: false; error: string; code?: typeof PERSISTENCE_WRITE_BLOCKED_CODE };

function revalidatePlanningPaths(planId?: string) {
  revalidatePath("/preventive-planning");
  if (planId) revalidatePath(`/preventive-planning/${planId}`);
  revalidatePath("/maintenance-orders");
  revalidatePath("/donnees-de-base/machines");
  revalidateTag(CACHE_TAGS.maintenanceOrders);
  revalidateTag(CACHE_TAGS.machines);
}

/** Génération OM best-effort : un échec n'annule pas l'enregistrement du plan. */
async function regeneratePlanSafely(planId: string, reset: boolean): Promise<string | undefined> {
  try {
    if (reset) await resetFuturePlanOccurrences(planId);
    await generatePreventiveOrdersForPlan(planId);
    return undefined;
  } catch (err) {
    console.error("[preventive-plan] génération OM", err);
    return "Plan enregistré, mais la génération des OM préventifs a échoué (voir les logs serveur). Relancez « Générer les OM » après correction.";
  }
}

type WritableGate ={ ok: true; user: SessionUser } | PreventivePlanActionResult;

async function requireWritable(): Promise<WritableGate> {
  const auth = requireManageAction();
  if (!auth.ok) return { ok: false, error: auth.error };
  const ready = await isPreventivePersistenceReady();
  if (!ready) {
    return { ok: false, error: PERSISTENCE_DISABLED_MESSAGE, code: PERSISTENCE_WRITE_BLOCKED_CODE };
  }
  return { ok: true, user: auth.user };
}

function isWritableOk(gate: WritableGate): gate is { ok: true; user: SessionUser } {
  return gate.ok === true && "user" in gate;
}

async function resolveActorUserId(user: SessionUser): Promise<string | null> {
  const found = await prisma.user.findUnique({
    where: { email: user.email },
    select: { id: true },
  });
  return found?.id ?? null;
}

async function assertPlanRelations(input: {
  machineId: string;
  maintenanceTypeId: string;
  assigneeTechnicianId?: string | null;
}): Promise<PreventivePlanActionResult | { ok: true }> {
  if (input.maintenanceTypeId.startsWith("design:")) {
    return {
      ok: false,
      error: "Type de maintenance de conception uniquement. Utilisez un type persisté en base.",
      code: PERSISTENCE_WRITE_BLOCKED_CODE,
    };
  }

  const machine = await prisma.machine.findUnique({
    where: { id: input.machineId },
    select: { id: true },
  });
  if (!machine) return { ok: false, error: "Machine introuvable." };

  const type = await prisma.maintenanceType.findFirst({
    where: { id: input.maintenanceTypeId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!type) return { ok: false, error: "Type de maintenance introuvable ou inactif." };

  if (input.assigneeTechnicianId) {
    const tech = await prisma.technician.findUnique({
      where: { id: input.assigneeTechnicianId },
      select: { id: true },
    });
    if (!tech) return { ok: false, error: "Technicien responsable introuvable." };
  }

  return { ok: true };
}

function parseFormDates(formData: FormData) {
  const startRaw = formData.get("startDate")?.toString() ?? "";
  const endRaw = formData.get("endDate")?.toString().trim() || null;
  const rulesRaw = formData.get("scheduleRulesJson")?.toString() ?? "[]";
  const timesRaw = formData.get("defaultTimesJson")?.toString() ?? "[]";
  let scheduleRules: unknown[] = [];
  let defaultTimes: string[] = [];
  try {
    scheduleRules = JSON.parse(rulesRaw) as unknown[];
  } catch {
    scheduleRules = [];
  }
  try {
    defaultTimes = JSON.parse(timesRaw) as string[];
  } catch {
    defaultTimes = [];
  }

  return {
    id: formData.get("id")?.toString(),
    machineId: formData.get("machineId")?.toString() ?? "",
    maintenanceTypeId: formData.get("maintenanceTypeId")?.toString() ?? "",
    title: formData.get("title")?.toString() ?? "",
    description: formData.get("description")?.toString() || null,
    instructions: formData.get("instructions")?.toString() || null,
    frequency: formData.get("frequency")?.toString() ?? "DAILY",
    occurrencesPerPeriod: Number(formData.get("occurrencesPerPeriod")?.toString() ?? "1"),
    scheduleMode: formData.get("scheduleMode")?.toString() ?? "FIXED",
    includeSunday: formData.get("includeSunday") === "true" || formData.get("includeSunday") === "on",
    sundayPolicy: formData.get("sundayPolicy")?.toString() ?? "NEXT_MONDAY",
    startDate: startRaw,
    endDate: endRaw,
    estimatedDurationMin: formData.get("estimatedDurationMin")?.toString()
      ? Number(formData.get("estimatedDurationMin"))
      : null,
    assigneeTechnicianId: formData.get("assigneeTechnicianId")?.toString() || null,
    status: formData.get("status")?.toString() ?? "ACTIVE",
    defaultTimes,
    scheduleRules,
    generationHorizonDays: Number(formData.get("generationHorizonDays")?.toString() ?? "30"),
  };
}

export async function createPreventivePlanAction(formData: FormData): Promise<PreventivePlanActionResult> {
  const gate = await requireWritable();
  if (!isWritableOk(gate)) return gate;

  const parsed = preventivePlanCreateSchema.safeParse(parseFormDates(formData));
  if (!parsed.success) {
    const msg =
      parsed.error.flatten().formErrors[0] ||
      Object.values(parsed.error.flatten().fieldErrors).flat()[0] ||
      "Données invalides.";
    return { ok: false, error: String(msg) };
  }

  const data = parsed.data;
  const relations = await assertPlanRelations(data);
  if (!relations.ok) return relations;

  const actorId = await resolveActorUserId(gate.user);

  try {
    const plan = await prisma.preventiveMaintenancePlan.create({
      data: {
        machineId: data.machineId,
        maintenanceTypeId: data.maintenanceTypeId,
        title: data.title,
        description: data.description ?? null,
        instructions: data.instructions ?? null,
        frequency: data.frequency,
        occurrencesPerPeriod: data.occurrencesPerPeriod,
        scheduleMode: data.scheduleMode,
        includeSunday: data.includeSunday,
        sundayPolicy: data.sundayPolicy,
        startDate: data.startDate,
        endDate: data.endDate ?? null,
        estimatedDurationMin: data.estimatedDurationMin ?? null,
        assigneeTechnicianId: data.assigneeTechnicianId || null,
        status: data.status,
        defaultTimes: data.defaultTimes,
        generationHorizonDays: data.generationHorizonDays,
        createdByUserId: actorId,
        updatedByUserId: actorId,
        scheduleRules: {
          create: data.scheduleRules.map((r) => ({
            sortOrder: r.sortOrder,
            weekday: r.weekday ?? null,
            monthDay: r.monthDay ?? null,
            month: r.month ?? null,
            timeLocal: r.timeLocal,
          })),
        },
        revisions: {
          create: {
            version: 1,
            snapshot: data as object,
            changeSummary: "Création initiale",
            changedByUserId: actorId,
          },
        },
      },
      select: { id: true },
    });

    const warning = await regeneratePlanSafely(plan.id, false);
    revalidatePlanningPaths(plan.id);
    return { ok: true, id: plan.id, warning };
  } catch (err) {
    console.error("[createPreventivePlanAction]", err);
    return { ok: false, error: "Échec de création du plan (contrainte ou erreur serveur)." };
  }
}

export async function updatePreventivePlanAction(formData: FormData): Promise<PreventivePlanActionResult> {
  const gate = await requireWritable();
  if (!isWritableOk(gate)) return gate;

  const parsed = preventivePlanUpdateSchema.safeParse(parseFormDates(formData));
  if (!parsed.success) {
    const msg =
      parsed.error.flatten().formErrors[0] ||
      Object.values(parsed.error.flatten().fieldErrors).flat()[0] ||
      "Données invalides.";
    return { ok: false, error: String(msg) };
  }

  const data = parsed.data;
  const relations = await assertPlanRelations(data);
  if (!relations.ok) return relations;

  const existing = await prisma.preventiveMaintenancePlan.findUnique({
    where: { id: data.id },
    select: { id: true, version: true },
  });
  if (!existing) return { ok: false, error: "Plan introuvable." };

  const actorId = await resolveActorUserId(gate.user);
  const nextVersion = existing.version + 1;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.maintenanceScheduleRule.deleteMany({ where: { planId: data.id } });
      await tx.preventiveMaintenancePlan.update({
        where: { id: data.id },
        data: {
          machineId: data.machineId,
          maintenanceTypeId: data.maintenanceTypeId,
          title: data.title,
          description: data.description ?? null,
          instructions: data.instructions ?? null,
          frequency: data.frequency,
          occurrencesPerPeriod: data.occurrencesPerPeriod,
          scheduleMode: data.scheduleMode,
          includeSunday: data.includeSunday,
          sundayPolicy: data.sundayPolicy,
          startDate: data.startDate,
          endDate: data.endDate ?? null,
          estimatedDurationMin: data.estimatedDurationMin ?? null,
          assigneeTechnicianId: data.assigneeTechnicianId || null,
          status: data.status,
          defaultTimes: data.defaultTimes,
          generationHorizonDays: data.generationHorizonDays,
          version: nextVersion,
          updatedByUserId: actorId,
          scheduleRules: {
            create: data.scheduleRules.map((r) => ({
              sortOrder: r.sortOrder,
              weekday: r.weekday ?? null,
              monthDay: r.monthDay ?? null,
              month: r.month ?? null,
              timeLocal: r.timeLocal,
            })),
          },
        },
      });
      await tx.preventivePlanRevision.create({
        data: {
          planId: data.id,
          version: nextVersion,
          snapshot: data as object,
          changeSummary: "Modification du plan",
          changedByUserId: actorId,
        },
      });
    });
  } catch (err) {
    console.error("[updatePreventivePlanAction]", err);
    return { ok: false, error: "Échec de modification du plan (contrainte ou erreur serveur)." };
  }

  const warning = await regeneratePlanSafely(data.id, true);
  revalidatePlanningPaths(data.id);
  return { ok: true, id: data.id, warning };
}

export async function setPreventivePlanStatusAction(
  id: string,
  status: PreventivePlanStatus,
): Promise<PreventivePlanActionResult> {
  const gate = await requireWritable();
  if (!isWritableOk(gate)) return gate;
  if (!id?.trim()) return { ok: false, error: "Plan introuvable." };
  if (!["ACTIVE", "SUSPENDED", "ARCHIVED"].includes(status)) {
    return { ok: false, error: "Statut invalide." };
  }

  const actorId = await resolveActorUserId(gate.user);

  try {
    const existing = await prisma.preventiveMaintenancePlan.findUnique({
      where: { id },
      select: { id: true, version: true, status: true },
    });
    if (!existing) return { ok: false, error: "Plan introuvable ou non modifiable." };

    const nextVersion = existing.version + 1;
    await prisma.$transaction(async (tx) => {
      await tx.preventiveMaintenancePlan.update({
        where: { id },
        data: { status, version: nextVersion, updatedByUserId: actorId },
      });
      await tx.preventivePlanRevision.create({
        data: {
          planId: id,
          version: nextVersion,
          snapshot: { status, previousStatus: existing.status },
          changeSummary: `Statut → ${status}`,
          changedByUserId: actorId,
        },
      });
    });
  } catch (err) {
    console.error("[setPreventivePlanStatusAction]", err);
    return { ok: false, error: "Plan introuvable ou non modifiable." };
  }

  const warning = await regeneratePlanSafely(id, true);
  revalidatePlanningPaths(id);
  return { ok: true, id, warning };
}

export async function generatePreventiveOrdersAction(): Promise<
  { ok: true; result: GenerationResult } | { ok: false; error: string }
> {
  const gate = await requireWritable();
  if (!isWritableOk(gate)) return { ok: false, error: gate.ok ? "Accès refusé." : gate.error };
  try {
    const result = await generateAllPreventiveOrders();
    revalidatePlanningPaths();
    return { ok: true, result };
  } catch (err) {
    console.error("[generatePreventiveOrdersAction]", err);
    return { ok: false, error: "Échec de la génération des OM préventifs." };
  }
}
