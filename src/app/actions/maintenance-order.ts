"use server";

import { MaintenanceOrderStatus } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache/tags";
import { requireManageAction } from "@/lib/auth/session-server";
import { fetchMaintenanceOrderDetail } from "@/lib/gmao/maintenance-order-detail-query";
import { fetchMaintenanceOrders } from "@/lib/gmao/maintenance-orders-query";
import { prisma } from "@/lib/db/prisma";
import {
  buildOrderLinesFromInput,
  maintenanceOrderSchema,
  maintenanceOrderUpdateSchema,
} from "@/lib/validations/maintenance-order";

export type MaintenanceOrderActionResult = { ok: true; id: string } | { ok: false; error: string };

function revalidateMaintenanceOrderPaths() {
  revalidatePath("/maintenance-orders");
  revalidateTag(CACHE_TAGS.maintenanceOrders);
}

async function generateReference(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `OM-${year}-`;
  const last = await prisma.maintenanceOrder.findFirst({
    where: { reference: { startsWith: prefix } },
    orderBy: { reference: "desc" },
    select: { reference: true },
  });
  const nextNum = last ? Number.parseInt(last.reference.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(nextNum).padStart(4, "0")}`;
}

function parseOrderForm(formData: FormData) {
  const machineIdsRaw = formData.get("machineIds")?.toString() ?? "";
  const machineIds = machineIdsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    plannedDate: formData.get("plannedDate")?.toString() ?? "",
    interventionType: formData.get("interventionType")?.toString() ?? "PREVENTIVE",
    observationComment: formData.get("observationComment")?.toString().trim() || null,
    managerApproval: formData.get("managerApproval")?.toString().trim() || null,
    machineIds,
    taskNettoyage: formData.get("taskNettoyage") === "on" || formData.get("taskNettoyage") === "true",
    taskGraissage: formData.get("taskGraissage") === "on" || formData.get("taskGraissage") === "true",
    taskHuile: formData.get("taskHuile") === "on" || formData.get("taskHuile") === "true",
    taskControl: formData.get("taskControl") === "on" || formData.get("taskControl") === "true",
    taskNonConforme: formData.get("taskNonConforme") === "on" || formData.get("taskNonConforme") === "true",
  };
}

export async function createMaintenanceOrderAction(formData: FormData): Promise<MaintenanceOrderActionResult> {
  const auth = requireManageAction();
  if (!auth.ok) return { ok: false, error: auth.error };
  const parsed = maintenanceOrderSchema.safeParse(parseOrderForm(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().formErrors[0] ?? "Données invalides." };
  }

  try {
    const reference = await generateReference();
    const lines = buildOrderLinesFromInput(parsed.data);

    const order = await prisma.maintenanceOrder.create({
      data: {
        reference,
        plannedDate: parsed.data.plannedDate,
        interventionType: parsed.data.interventionType,
        observationComment: parsed.data.observationComment ?? null,
        managerApproval: parsed.data.managerApproval ?? null,
        lines: {
          create: lines.map((l) => ({
            machineId: l.machineId,
            taskNettoyage: l.taskNettoyage,
            taskGraissage: l.taskGraissage,
            taskHuile: l.taskHuile,
            taskControl: l.taskControl,
            taskNonConforme: l.taskNonConforme,
          })),
        },
      },
    });

    revalidateMaintenanceOrderPaths();
    return { ok: true, id: order.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Échec création." };
  }
}

export async function updateMaintenanceOrderAction(formData: FormData): Promise<MaintenanceOrderActionResult> {
  const auth = requireManageAction();
  if (!auth.ok) return { ok: false, error: auth.error };
  const parsed = maintenanceOrderUpdateSchema.safeParse({
    id: formData.get("id")?.toString().trim() ?? "",
    ...parseOrderForm(formData),
    status: formData.get("status")?.toString() || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().formErrors[0] ?? "Données invalides." };
  }

  try {
    const lines = buildOrderLinesFromInput(parsed.data);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.maintenanceOrder.findUnique({
        where: { id: parsed.data.id },
        include: { lines: { include: { maintenanceLog: { select: { id: true } } } } },
      });
      if (!existing) throw new Error("Ordre introuvable");

      const completedMachineIds = new Set(
        existing.lines.filter((l) => l.maintenanceLog).map((l) => l.machineId),
      );

      await tx.maintenanceOrderLine.deleteMany({
        where: {
          maintenanceOrderId: parsed.data.id,
          maintenanceLog: { is: null },
        },
      });

      for (const line of lines) {
        if (completedMachineIds.has(line.machineId)) continue;
        await tx.maintenanceOrderLine.upsert({
          where: {
            maintenanceOrderId_machineId: {
              maintenanceOrderId: parsed.data.id,
              machineId: line.machineId,
            },
          },
          create: {
            maintenanceOrderId: parsed.data.id,
            machineId: line.machineId,
            taskNettoyage: line.taskNettoyage,
            taskGraissage: line.taskGraissage,
            taskHuile: line.taskHuile,
            taskControl: line.taskControl,
            taskNonConforme: line.taskNonConforme,
          },
          update: {
            taskNettoyage: line.taskNettoyage,
            taskGraissage: line.taskGraissage,
            taskHuile: line.taskHuile,
            taskControl: line.taskControl,
            taskNonConforme: line.taskNonConforme,
          },
        });
      }

      await tx.maintenanceOrder.update({
        where: { id: parsed.data.id },
        data: {
          plannedDate: parsed.data.plannedDate,
          interventionType: parsed.data.interventionType,
          observationComment: parsed.data.observationComment ?? null,
          managerApproval: parsed.data.managerApproval ?? null,
          ...(parsed.data.status ? { status: parsed.data.status } : {}),
        },
      });
    });

    revalidateMaintenanceOrderPaths();
    return { ok: true, id: parsed.data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Échec mise à jour." };
  }
}

export async function deleteMaintenanceOrderAction(id: string): Promise<MaintenanceOrderActionResult> {
  const auth = requireManageAction();
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!id?.trim()) return { ok: false, error: "Ordre introuvable." };
  try {
    await prisma.maintenanceOrder.delete({ where: { id } });
    revalidateMaintenanceOrderPaths();
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Suppression impossible." };
  }
}

export async function deleteMaintenanceOrdersBulkAction(ids: string[]): Promise<
  | { ok: true; deleted: number; ids: string[] }
  | { ok: false; error: string }
> {
  const auth = requireManageAction();
  if (!auth.ok) return { ok: false, error: auth.error };
  const unique = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
  if (unique.length === 0) return { ok: false, error: "Aucun ordre sélectionné." };

  try {
    const result = await prisma.maintenanceOrder.deleteMany({ where: { id: { in: unique } } });
    revalidateMaintenanceOrderPaths();
    return { ok: true, deleted: result.count, ids: unique };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Suppression impossible." };
  }
}

export async function getMaintenanceOrderDetailAction(id: string) {
  if (!id?.trim()) return { ok: false as const, error: "Ordre introuvable." };
  try {
    const detail = await fetchMaintenanceOrderDetail(id);
    if (!detail) return { ok: false as const, error: "Ordre introuvable." };
    return { ok: true as const, data: detail };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Chargement impossible." };
  }
}

export async function refreshMaintenanceOrdersAction() {
  return fetchMaintenanceOrders();
}

export async function completeMaintenanceOrderLine(
  lineId: string,
  maintenanceLogId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.maintenanceLog.update({
      where: { id: maintenanceLogId },
      data: { maintenanceOrderLineId: lineId },
    });

    const line = await tx.maintenanceOrderLine.findUnique({
      where: { id: lineId },
      select: { maintenanceOrderId: true },
    });
    if (!line) return;

    const pending = await tx.maintenanceOrderLine.count({
      where: {
        maintenanceOrderId: line.maintenanceOrderId,
        maintenanceLog: { is: null },
      },
    });

    if (pending === 0) {
      await tx.maintenanceOrder.update({
        where: { id: line.maintenanceOrderId },
        data: { status: MaintenanceOrderStatus.COMPLETED },
      });
    }
  });

  revalidateMaintenanceOrderPaths();
}
