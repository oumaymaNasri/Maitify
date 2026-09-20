"use server";

import {
  AlertSeverity,
  AlertType,
  FailureCause,
  MachineAssetStatus,
  MaintenanceAttachmentKind,
  MaintenanceWorkflowStatus,
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
    date,
    workPerformed,
    failureDescription: failureDescription || undefined,
    durationMinutes: durationMinutes !== null && Number.isFinite(durationMinutes) ? durationMinutes : null,
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
  const logType = mapOperationToLegacyType(data.operationType);

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
          type: mapOperationToLegacyType(data.operationType),
          workflowStatus: data.workflowStatus,
          workPerformed: data.workPerformed,
          failureDescription: data.failureDescription ?? null,
          durationMinutes: data.durationMinutes ?? null,
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
        type: mapOperationToLegacyType(data.operationType),
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
    date,
    workPerformed: formData.get("workPerformed")?.toString().trim() ?? "",
    failureDescription: formData.get("failureDescription")?.toString().trim() || null,
    durationMinutes: durationMinutes !== null && Number.isFinite(durationMinutes) ? durationMinutes : null,
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
      const logType = mapOperationToLegacyType(data.operationType);
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
          type: mapOperationToLegacyType(data.operationType),
          workflowStatus: data.workflowStatus,
          workPerformed: data.workPerformed,
          failureDescription: data.failureDescription ?? null,
          durationMinutes: data.durationMinutes ?? null,
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
