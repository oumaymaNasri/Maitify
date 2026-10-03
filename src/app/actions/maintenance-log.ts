"use server";

import {
  AlertSeverity,
  AlertType,
  DurationUnit,
  FailureCause,
  InterventionType,
  MachineAssetStatus,
  MaintenanceAttachmentKind,
  MaintenanceWorkflowStatus,
  OperationType,
  Prisma,
  TechnicianAvailability,
} from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import { CACHE_TAGS } from "@/lib/cache/tags";
import { requireManageAction, requireSessionAction } from "@/lib/auth/session-server";
import { createStockMovementFromIntervention } from "@/lib/gmao/stock-movement-helper";
import { prisma } from "@/lib/db/prisma";
import { fetchInterventionDetail } from "@/lib/gmao/intervention-detail-query";
import { fetchInterventionListByIds } from "@/lib/gmao/interventions-query";
import { attachLogToDailyOrder, type DailyOrderLink } from "@/lib/gmao/maintenance-order-from-logs";
import {
  assertDailyOrderWritable,
  assertLogWritable,
  findExistingIntervention,
} from "@/lib/gmao/maintenance-catalog-reconcile";
import { completeMaintenanceOrderLine } from "@/app/actions/maintenance-order";
import {
  maintenanceLogEditSchema,
  maintenanceLogPayloadSchema,
  mapOperationToLegacyType,
} from "@/lib/validations/maintenance-log";
import { failureCauseFr } from "@/lib/view/gmao-labels";

export type CreateMaintenanceLogResult =
  | { ok: true; id: string; om?: DailyOrderLink }
  | { ok: false; error: string };

export type MaintenanceLogActionResult = { ok: true; id: string } | { ok: false; error: string };

function revalidateMaintenancePaths() {
  revalidateTag(CACHE_TAGS.interventions);
  revalidateTag(CACHE_TAGS.parts);
  revalidateTag(CACHE_TAGS.stock);
  revalidateTag(CACHE_TAGS.machines);
  revalidateTag(CACHE_TAGS.maintenanceOrders);
  revalidateTag(CACHE_TAGS.dashboard);
  revalidatePath("/interventions");
  revalidatePath("/maintenance-orders");
  revalidatePath("/stock");
}

const MAX_DATA_URL = 1_200_000;

function parseDurationUnit(raw: string | undefined): DurationUnit {
  const v = raw?.trim() as DurationUnit | undefined;
  if (v && Object.values(DurationUnit).includes(v)) return v;
  return DurationUnit.PER_MINUTE;
}

function parseInterventionType(raw: string | undefined, operationType: OperationType): InterventionType {
  const v = raw?.trim() as InterventionType | undefined;
  if (v && Object.values(InterventionType).includes(v)) return v;
  return mapOperationToLegacyType(operationType);
}

function parseFailureCause(raw: string | undefined): FailureCause | null {
  if (!raw?.trim()) return null;
  const v = raw.trim() as FailureCause;
  return Object.values(FailureCause).includes(v) ? v : null;
}

export type UsageLineInput = { sparePartId: string; quantity: number };

function mergeUsageLines(lines: UsageLineInput[]): UsageLineInput[] {
  const m = new Map<string, number>();
  for (const l of lines) {
    const q = Math.floor(Number(l.quantity));
    if (!l.sparePartId || !(q > 0)) continue;
    m.set(l.sparePartId, (m.get(l.sparePartId) ?? 0) + q);
  }
  return Array.from(m.entries()).map(([sparePartId, quantity]) => ({ sparePartId, quantity }));
}

function formatZodError(err: z.ZodError): string {
  const flat = err.flatten();
  const fromField = Object.values(flat.fieldErrors).flat().find(Boolean);
  const fromForm = flat.formErrors.find(Boolean);
  return (typeof fromField === "string" && fromField) || (typeof fromForm === "string" && fromForm) || "Données invalides.";
}

export async function createMaintenanceLogWithParts(formData: FormData): Promise<CreateMaintenanceLogResult> {
  const auth = requireSessionAction();
  if (!auth.ok) return { ok: false, error: auth.error };
  const dateRaw = formData.get("date")?.toString();
  const workPerformed = formData.get("workPerformed")?.toString().trim() ?? "";
  const failureDescription = formData.get("failureDescription")?.toString().trim() || null;
  const durationMinutesRaw = formData.get("durationMinutes")?.toString();
  const linesJson = formData.get("linesJson")?.toString() ?? "[]";
  const signature = formData.get("signature")?.toString().trim() || "";
  const photoBefore = formData.get("photoBefore")?.toString().trim() || "";
  const photoAfter = formData.get("photoAfter")?.toString().trim() || "";
  const workflowRaw = formData.get("workflowStatus")?.toString() ?? "COMPLETED";
  const machineStatusOnComplete =
    (formData.get("machineStatusOnComplete")?.toString() as MachineAssetStatus | undefined) ?? MachineAssetStatus.OPERATIONAL;

  let parsedLines: UsageLineInput[] = [];
  try {
    const arr = JSON.parse(linesJson) as unknown;
    if (!Array.isArray(arr)) throw new Error("bad");
    parsedLines = arr.map((x) => ({
      sparePartId: String((x as { sparePartId?: string }).sparePartId ?? ""),
      quantity: Number((x as { quantity?: number }).quantity),
    }));
  } catch {
    return { ok: false, error: "Lignes pièces invalides." };
  }

  const lines = mergeUsageLines(parsedLines);
  const date = dateRaw ? new Date(dateRaw) : new Date();
  if (Number.isNaN(date.getTime())) return { ok: false, error: "Date invalide." };

  const durationMinutes = durationMinutesRaw?.trim()
    ? Math.max(0, Math.floor(Number(durationMinutesRaw.replace(",", "."))))
    : null;

  let technicianId = formData.get("technicianId")?.toString().trim() ?? "";
  if (auth.user.role === "TECHNICIEN") {
    if (!auth.user.technicianId) {
      return { ok: false, error: "Profil technicien non lié au compte." };
    }
    if (technicianId && technicianId !== auth.user.technicianId) {
      return { ok: false, error: "Vous ne pouvez créer des interventions qu'à votre nom." };
    }
    technicianId = auth.user.technicianId;
  }

  const validated = maintenanceLogPayloadSchema.safeParse({
    machineId: formData.get("machineId")?.toString().trim() ?? "",
    technicianId,
    operationType: formData.get("operationType")?.toString(),
    type: parseInterventionType(
      formData.get("type")?.toString(),
      (formData.get("operationType")?.toString() ?? "DIAGNOSTIC") as OperationType,
    ),
    date,
    workPerformed,
    failureDescription: failureDescription || undefined,
    durationMinutes: durationMinutes !== null && Number.isFinite(durationMinutes) ? durationMinutes : null,
    durationUnit: parseDurationUnit(formData.get("durationUnit")?.toString()),
    sectorMaintenance: formData.get("sectorMaintenance")?.toString().trim() || null,
    service: formData.get("service")?.toString().trim() || null,
    operation: formData.get("operation")?.toString().trim() || null,
    difficulties: formData.get("difficulties")?.toString().trim() || null,
    failureCause: parseFailureCause(formData.get("failureCause")?.toString()),
    signature,
    photoBefore,
    photoAfter,
    preventiveCleaning: formData.get("preventiveCleaning") === "on",
    preventiveLubrication: formData.get("preventiveLubrication") === "on",
    preventiveOil: formData.get("preventiveOil") === "on",
    preventiveControl: formData.get("preventiveControl") === "on",
    preventiveNonConforme: formData.get("preventiveNonConforme") === "on",
    maintenanceOrderLineId: formData.get("maintenanceOrderLineId")?.toString().trim() || undefined,
    lines,
    workflowStatus: workflowRaw === "OPEN" ? MaintenanceWorkflowStatus.OPEN : MaintenanceWorkflowStatus.COMPLETED,
    machineStatusOnComplete,
  });

  if (!validated.success) {
    return { ok: false, error: formatZodError(validated.error) };
  }

  const data = validated.data;
  const sigStore = data.signature?.trim() ? data.signature.trim() : null;

  for (const u of [sigStore, data.photoBefore, data.photoAfter]) {
    if (typeof u === "string" && u.length > MAX_DATA_URL) {
      return { ok: false, error: "Image ou signature trop volumineuse." };
    }
  }

  const isCompleted = data.workflowStatus === MaintenanceWorkflowStatus.COMPLETED;
  const logType = data.type ?? mapOperationToLegacyType(data.operationType);

  try {
    await assertDailyOrderWritable(prisma, data.date);
    const duplicate = await findExistingIntervention(prisma, {
      machineId: data.machineId,
      date: data.date,
      type: logType,
    });
    if (duplicate) {
      return {
        ok: false,
        error: "Une intervention de ce type existe déjà pour cette machine à cette date.",
      };
    }

    const created = await prisma.$transaction(async (tx) => {
      if (data.lines.length > 0 && isCompleted) {
        for (const line of data.lines) {
          const part = await tx.sparePart.findUnique({ where: { id: line.sparePartId } });
          if (!part) throw new Error(`Pièce introuvable.`);
          if (part.quantity < line.quantity) {
            throw new Error(
              `Stock insuffisant pour « ${part.designation} » (dispo ${part.quantity}, demandé ${line.quantity}). Validation bloquée.`,
            );
          }
        }
      }

      const log = await tx.maintenanceLog.create({
        data: {
          machineId: data.machineId,
          technicianId: data.technicianId,
          date: data.date,
          operationType: data.operationType,
          type: logType,
          workflowStatus: data.workflowStatus,
          workPerformed: data.workPerformed,
          failureDescription: data.failureDescription ?? null,
          durationMinutes: data.durationMinutes ?? null,
          durationUnit: data.durationUnit ?? DurationUnit.PER_MINUTE,
          sectorMaintenance: data.sectorMaintenance ?? null,
          service: data.service ?? null,
          operation: data.operation ?? null,
          difficulties: data.difficulties ?? null,
          failureCause: data.failureCause ?? null,
          signature: sigStore,
          preventiveCleaning: data.preventiveCleaning ?? null,
          preventiveLubrication: data.preventiveLubrication ?? null,
          preventiveOil: data.preventiveOil ?? null,
          preventiveControl: data.preventiveControl ?? null,
          preventiveNonConforme: data.preventiveNonConforme ?? null,
          maintenanceOrderLineId: data.maintenanceOrderLineId?.trim() || null,
        },
      });

      const attachments: Prisma.MaintenanceAttachmentCreateManyInput[] = [];
      if (data.photoBefore?.trim()) {
        attachments.push({
          maintenanceLogId: log.id,
          kind: MaintenanceAttachmentKind.PHOTO_BEFORE,
          url: data.photoBefore.trim(),
        });
      }
      if (data.photoAfter?.trim()) {
        attachments.push({
          maintenanceLogId: log.id,
          kind: MaintenanceAttachmentKind.PHOTO_AFTER,
          url: data.photoAfter.trim(),
        });
      }
      if (attachments.length) await tx.maintenanceAttachment.createMany({ data: attachments });

      if (data.technicianId) {
        await tx.technician.update({
          where: { id: data.technicianId },
          data: {
            availability: isCompleted ? TechnicianAvailability.DISPONIBLE : TechnicianAvailability.EN_INTERVENTION,
          },
        });
      }

      await tx.machine.update({
        where: { id: data.machineId },
        data: {
          assetStatus: isCompleted
            ? (data.machineStatusOnComplete ?? MachineAssetStatus.OPERATIONAL)
            : MachineAssetStatus.UNDER_MAINTENANCE,
        },
      });

      if (isCompleted && data.lines.length > 0) {
        for (const line of data.lines) {
          const part = await tx.sparePart.findUnique({ where: { id: line.sparePartId } });
          if (!part) throw new Error(`Pièce introuvable.`);
          await tx.sparePartUsage.create({
            data: { maintenanceLogId: log.id, sparePartId: part.id, quantityUsed: line.quantity },
          });
          await createStockMovementFromIntervention(tx, part.id, line.quantity, log.id);
          const updated = await tx.sparePart.update({
            where: { id: part.id },
            data: { quantity: { decrement: line.quantity } },
          });
          if (updated.quantity <= updated.minStock) {
            await tx.gmaoAlert.create({
              data: {
                type: AlertType.STOCK_LOW,
                severity: updated.quantity <= updated.minStock ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
                title: `Stock critique : ${part.designation}`,
                message: `Stock ${updated.quantity} (seuil ${updated.minStock}) après intervention.`,
                metadata: { sparePartId: part.id, maintenanceLogId: log.id } as Prisma.InputJsonValue,
              },
            });
          }
        }
      }

      const om = await attachLogToDailyOrder(tx, {
        logId: log.id,
        date: data.date,
        type: logType,
        machineId: data.machineId,
        existingLineId: data.maintenanceOrderLineId?.trim() || null,
        preventiveCleaning: data.preventiveCleaning,
        preventiveLubrication: data.preventiveLubrication,
        preventiveOil: data.preventiveOil,
        preventiveControl: data.preventiveControl,
        preventiveNonConforme: data.preventiveNonConforme,
        notify: true,
      });

      return { id: log.id, om };
    });

    if (data.maintenanceOrderLineId?.trim() && isCompleted) {
      await completeMaintenanceOrderLine(data.maintenanceOrderLineId.trim(), created.id);
    }

    revalidateMaintenancePaths();
    return { ok: true, id: created.id, om: created.om };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Échec de l'enregistrement." };
  }
}

export async function updateMaintenanceLogAction(formData: FormData): Promise<MaintenanceLogActionResult> {
  const auth = requireManageAction();
  if (!auth.ok) return { ok: false, error: auth.error };
  const dateRaw = formData.get("date")?.toString();
  const date = dateRaw ? new Date(dateRaw) : new Date();
  if (Number.isNaN(date.getTime())) return { ok: false, error: "Date invalide." };

  const durationMinutesRaw = formData.get("durationMinutes")?.toString();
  const durationMinutes = durationMinutesRaw?.trim()
    ? Math.max(0, Math.floor(Number(durationMinutesRaw.replace(",", "."))))
    : null;

  const workflowRaw = formData.get("workflowStatus")?.toString() ?? "COMPLETED";

  const validated = maintenanceLogEditSchema.safeParse({
    id: formData.get("id")?.toString().trim() ?? "",
    machineId: formData.get("machineId")?.toString().trim() ?? "",
    technicianId: formData.get("technicianId")?.toString().trim() ?? "",
    operationType: formData.get("operationType")?.toString(),
    type: parseInterventionType(
      formData.get("type")?.toString(),
      (formData.get("operationType")?.toString() ?? "DIAGNOSTIC") as OperationType,
    ),
    date,
    workPerformed: formData.get("workPerformed")?.toString().trim() ?? "",
    failureDescription: formData.get("failureDescription")?.toString().trim() || null,
    durationMinutes: durationMinutes !== null && Number.isFinite(durationMinutes) ? durationMinutes : null,
    durationUnit: parseDurationUnit(formData.get("durationUnit")?.toString()),
    sectorMaintenance: formData.get("sectorMaintenance")?.toString().trim() || null,
    service: formData.get("service")?.toString().trim() || null,
    operation: formData.get("operation")?.toString().trim() || null,
    difficulties: formData.get("difficulties")?.toString().trim() || null,
    failureCause: parseFailureCause(formData.get("failureCause")?.toString()),
    workflowStatus: workflowRaw === "OPEN" ? MaintenanceWorkflowStatus.OPEN : MaintenanceWorkflowStatus.COMPLETED,
  });

  if (!validated.success) {
    return { ok: false, error: formatZodError(validated.error) };
  }

  const data = validated.data;

  try {
    await prisma.$transaction(async (tx) => {
      await assertLogWritable(tx, data.id);
      await assertDailyOrderWritable(tx, data.date);
      const logType = data.type ?? mapOperationToLegacyType(data.operationType);
      const duplicate = await findExistingIntervention(tx, {
        machineId: data.machineId,
        date: data.date,
        type: logType,
        excludeId: data.id,
      });
      if (duplicate) {
        throw new Error("Une intervention de ce type existe déjà pour cette machine à cette date.");
      }
      const log = await tx.maintenanceLog.update({
        where: { id: data.id },
        data: {
          machineId: data.machineId,
          technicianId: data.technicianId,
          date: data.date,
          operationType: data.operationType,
          type: logType,
          workflowStatus: data.workflowStatus,
          workPerformed: data.workPerformed,
          failureDescription: data.failureDescription ?? null,
          durationMinutes: data.durationMinutes ?? null,
          durationUnit: data.durationUnit ?? DurationUnit.PER_MINUTE,
          sectorMaintenance: data.sectorMaintenance ?? null,
          service: data.service ?? null,
          operation: data.operation ?? null,
          difficulties: data.difficulties ?? null,
          failureCause: data.failureCause ?? null,
        },
      });
      await attachLogToDailyOrder(tx, {
        logId: log.id,
        date: data.date,
        type: log.type,
        machineId: data.machineId,
        preventiveCleaning: log.preventiveCleaning,
        preventiveLubrication: log.preventiveLubrication,
        preventiveOil: log.preventiveOil,
        preventiveControl: log.preventiveControl,
        preventiveNonConforme: log.preventiveNonConforme,
      });
    });
    revalidateMaintenancePaths();
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Échec de la mise à jour." };
  }
}

export async function deleteMaintenanceLogAction(id: string): Promise<MaintenanceLogActionResult> {
  const auth = requireManageAction();
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!id?.trim()) return { ok: false, error: "Intervention introuvable." };
  try {
    await assertLogWritable(prisma, id);
    await prisma.maintenanceLog.delete({ where: { id } });
    revalidateMaintenancePaths();
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Suppression impossible." };
  }
}

export async function deleteMaintenanceLogsBulkAction(ids: string[]): Promise<
  | { ok: true; deleted: number; ids: string[] }
  | { ok: false; error: string; failedIds?: string[] }
> {
  const auth = requireManageAction();
  if (!auth.ok) return { ok: false, error: auth.error };
  const unique = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
  if (unique.length === 0) return { ok: false, error: "Aucune intervention sélectionnée." };

  const deleted: string[] = [];
  const failedIds: string[] = [];

  for (const id of unique) {
    try {
      await prisma.maintenanceLog.delete({ where: { id } });
      deleted.push(id);
    } catch {
      failedIds.push(id);
    }
  }

  if (deleted.length === 0) {
    return { ok: false, error: "Suppression impossible.", failedIds };
  }

  revalidateMaintenancePaths();
  return { ok: true, deleted: deleted.length, ids: deleted };
}

export async function getMaintenanceLogDetailAction(id: string) {
  if (!id?.trim()) return { ok: false as const, error: "ID invalide." };
  const auth = requireSessionAction();
  if (!auth.ok) return { ok: false as const, error: auth.error };
  try {
    const detail = await fetchInterventionDetail(id);
    if (!detail) return { ok: false as const, error: "Intervention introuvable." };
    if (auth.user.role === "TECHNICIEN") {
      if (!auth.user.technicianId || detail.technician?.id !== auth.user.technicianId) {
        return { ok: false as const, error: "Accès refusé." };
      }
    }
    return { ok: true as const, data: detail };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Erreur chargement." };
  }
}

export async function setPreventiveRealizedAction(
  id: string,
  realized: boolean | null,
): Promise<MaintenanceLogActionResult> {
  const auth = requireSessionAction();
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!id?.trim()) return { ok: false, error: "Intervention introuvable." };

  try {
    const log = await prisma.maintenanceLog.findUnique({
      where: { id },
      select: { id: true, type: true, technicianId: true },
    });
    if (!log) return { ok: false, error: "Intervention introuvable." };
    if (log.type !== "PREVENTIVE") {
      return { ok: false, error: "La validation ne s’applique qu’aux maintenances préventives." };
    }
    if (auth.user.role === "TECHNICIEN") {
      if (!auth.user.technicianId || log.technicianId !== auth.user.technicianId) {
        return { ok: false, error: "Accès refusé." };
      }
    }

    await prisma.maintenanceLog.update({
      where: { id },
      data: {
        preventiveRealized: realized,
        workflowStatus: realized === true ? MaintenanceWorkflowStatus.COMPLETED : MaintenanceWorkflowStatus.OPEN,
      },
    });
    revalidateMaintenancePaths();
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Enregistrement impossible." };
  }
}

const BULK_REALIZED_MAX = 2000;

export async function setPreventiveRealizedBulkAction(
  ids: string[],
  realized: boolean,
): Promise<{ ok: true; updated: number; skipped: number } | { ok: false; error: string }> {
  const auth = requireSessionAction();
  if (!auth.ok) return { ok: false, error: auth.error };

  const unique = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean))).slice(0, BULK_REALIZED_MAX);
  if (unique.length === 0) return { ok: false, error: "Aucune maintenance sélectionnée." };

  const where: Prisma.MaintenanceLogWhereInput = {
    id: { in: unique },
    type: "PREVENTIVE",
  };
  if (auth.user.role === "TECHNICIEN") {
    if (!auth.user.technicianId) return { ok: false, error: "Profil technicien non lié au compte." };
    where.technicianId = auth.user.technicianId;
  }

  try {
    const result = await prisma.maintenanceLog.updateMany({
      where,
      data: {
        preventiveRealized: realized,
        workflowStatus: realized ? MaintenanceWorkflowStatus.COMPLETED : MaintenanceWorkflowStatus.OPEN,
      },
    });
    revalidateMaintenancePaths();
    return { ok: true, updated: result.count, skipped: Math.max(0, unique.length - result.count) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Mise à jour groupée impossible." };
  }
}

const BULK_EDIT_MAX = 2000;
const BULK_CHUNK = 200;

const maintenanceLogBulkFieldSchema = z.enum([
  "technicianId",
  "sectorMaintenance",
  "service",
  "type",
  "operationType",
  "operation",
  "workflowStatus",
  "failureCause",
  "preventiveRealized",
]);

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function buildMaintenanceLogBulkData(
  field: z.infer<typeof maintenanceLogBulkFieldSchema>,
  value: string,
): Prisma.MaintenanceLogUncheckedUpdateManyInput | null {
  switch (field) {
    case "technicianId":
      return { technicianId: value.trim() || null };
    case "sectorMaintenance":
      return { sectorMaintenance: nullableText(value) };
    case "service":
      return { service: nullableText(value) };
    case "operation":
      return { operation: nullableText(value) };
    case "type": {
      const type = value.trim() as InterventionType;
      if (!Object.values(InterventionType).includes(type)) return null;
      return { type };
    }
    case "operationType": {
      const operationType = value.trim() as OperationType;
      if (!Object.values(OperationType).includes(operationType)) return null;
      return { operationType, type: mapOperationToLegacyType(operationType) };
    }
    case "workflowStatus": {
      const workflowStatus = value.trim() as MaintenanceWorkflowStatus;
      if (!Object.values(MaintenanceWorkflowStatus).includes(workflowStatus)) return null;
      return { workflowStatus };
    }
    case "failureCause": {
      const raw = value.trim();
      if (!raw) return { failureCause: null, failureCauseLabel: null };
      const failureCause = parseFailureCause(raw);
      if (!failureCause) return null;
      return { failureCause, failureCauseLabel: failureCauseFr(failureCause) };
    }
    case "preventiveRealized": {
      if (value === "true") {
        return { preventiveRealized: true, workflowStatus: MaintenanceWorkflowStatus.COMPLETED };
      }
      if (value === "false") {
        return { preventiveRealized: false, workflowStatus: MaintenanceWorkflowStatus.OPEN };
      }
      return { preventiveRealized: null };
    }
    default:
      return null;
  }
}

export type BulkUpdateLogsResult =
  | { ok: true; updated: number; skipped: number; items: Awaited<ReturnType<typeof fetchInterventionListByIds>> }
  | { ok: false; error: string };

async function resolveTechnicianId(value: string): Promise<string | null | undefined> {
  const raw = value.trim();
  if (!raw) return null;
  const byId = await prisma.technician.findUnique({ where: { id: raw }, select: { id: true } });
  if (byId) return byId.id;
  const techs = await prisma.technician.findMany({
    select: { id: true, firstName: true, lastName: true },
  });
  const needle = raw.toLowerCase();
  const exact = techs.filter((t) => `${t.firstName} ${t.lastName}`.trim().toLowerCase() === needle);
  if (exact.length === 1) return exact[0]!.id;
  const partial = techs.filter((t) => `${t.firstName} ${t.lastName}`.toLowerCase().includes(needle));
  if (partial.length === 1) return partial[0]!.id;
  return undefined;
}

export async function bulkUpdateMaintenanceLogsAction(input: {
  ids: string[];
  field: string;
  value: string;
}): Promise<BulkUpdateLogsResult> {
  const auth = requireManageAction();
  if (!auth.ok) return { ok: false, error: auth.error };

  const parsedField = maintenanceLogBulkFieldSchema.safeParse(input.field);
  if (!parsedField.success) return { ok: false, error: "Colonne non modifiable en masse." };

  const unique = Array.from(new Set((input.ids ?? []).map((id) => id.trim()).filter(Boolean))).slice(0, BULK_EDIT_MAX);
  if (unique.length === 0) return { ok: false, error: "Aucune ligne sélectionnée." };

  let value = input.value ?? "";
  if (parsedField.data === "technicianId") {
    const resolved = await resolveTechnicianId(value);
    if (resolved === undefined) return { ok: false, error: "Intervenant introuvable. Choisissez-le dans la liste." };
    value = resolved ?? "";
  }

  const data = buildMaintenanceLogBulkData(parsedField.data, value);
  if (!data) return { ok: false, error: "Valeur invalide pour cette colonne." };

  try {
    const existing = await prisma.maintenanceLog.findMany({
      where: { id: { in: unique } },
      select: { id: true, type: true },
    });
    let targetIds = existing.map((row) => row.id);
    if (parsedField.data === "preventiveRealized") {
      targetIds = existing.filter((row) => row.type === InterventionType.PREVENTIVE).map((row) => row.id);
    }
    if (targetIds.length === 0) {
      return { ok: false, error: "Aucune ligne sélectionnée n’a pu être mise à jour." };
    }

    let updated = 0;
    for (let i = 0; i < targetIds.length; i += BULK_CHUNK) {
      const chunk = targetIds.slice(i, i + BULK_CHUNK);
      const result = await prisma.maintenanceLog.updateMany({
        where: { id: { in: chunk } },
        data,
      });
      updated += result.count;
    }

    const items = await fetchInterventionListByIds(targetIds);
    revalidateMaintenancePaths();
    revalidatePath("/interventions", "page");
    return { ok: true, updated, skipped: Math.max(0, unique.length - updated), items };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Mise à jour groupée impossible." };
  }
}
