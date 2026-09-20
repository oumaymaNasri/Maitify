import type { InterventionType, MaintenanceOrderStatus, MaintenanceWorkflowStatus } from "@prisma/client";
import { revalidateTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache/tags";
import { prisma } from "@/lib/db/prisma";
import { dailyOrderDayKey, ensureLogsLinkedToDailyOrder } from "@/lib/gmao/maintenance-order-from-logs";

export type MaintenanceOrderLogVm = {
  id: string;
  type: InterventionType;
  date: string;
  machineId: string;
  machineName: string;
  machineLocation: string;
  technicianName: string | null;
  durationMinutes: number | null;
  workflowStatus: MaintenanceWorkflowStatus;
  workPerformed: string;
};

export type MaintenanceOrderDetailVm = {
  id: string;
  reference: string;
  plannedDate: string;
  dayKey: string | null;
  status: MaintenanceOrderStatus;
  observationComment: string | null;
  managerApproval: string | null;
  createdAt: string;
  updatedAt: string;
  preventiveCount: number;
  correctiveCount: number;
  lines: {
    id: string;
    machineId: string;
    machineName: string;
    machineLocation: string;
    taskNettoyage: boolean;
    taskGraissage: boolean;
    taskHuile: boolean;
    taskControl: boolean;
    taskNonConforme: boolean;
    completed: boolean;
    maintenanceLogId: string | null;
  }[];
  logs: MaintenanceOrderLogVm[];
};

function mapLog(log: {
  id: string;
  type: InterventionType;
  date: Date;
  durationMinutes: number | null;
  workflowStatus: MaintenanceWorkflowStatus;
  workPerformed: string;
  machine: { id: string; name: string; location: string };
  technician: { firstName: string; lastName: string } | null;
}): MaintenanceOrderLogVm {
  return {
    id: log.id,
    type: log.type,
    date: log.date.toISOString(),
    machineId: log.machine.id,
    machineName: log.machine.name,
    machineLocation: log.machine.location,
    technicianName: log.technician
      ? `${log.technician.firstName} ${log.technician.lastName}`.trim()
      : null,
    durationMinutes: log.durationMinutes,
    workflowStatus: log.workflowStatus,
    workPerformed: log.workPerformed,
  };
}

export async function fetchMaintenanceOrderDetail(id: string): Promise<MaintenanceOrderDetailVm | null> {
  const header = await prisma.maintenanceOrder.findUnique({
    where: { id },
    select: {
      id: true,
      reference: true,
      dayKey: true,
    },
  });
  if (!header) return null;

  const dayKey = dailyOrderDayKey(header);
  if (dayKey) {
    const relinked = await ensureLogsLinkedToDailyOrder(prisma, header.id, dayKey);
    if (relinked > 0) {
      revalidateTag(CACHE_TAGS.maintenanceOrders);
    }
  }

  const row = await prisma.maintenanceOrder.findUnique({
    where: { id },
    include: {
      lines: {
        orderBy: { machine: { name: "asc" } },
        include: {
          machine: { select: { id: true, name: true, location: true } },
          maintenanceLog: { select: { id: true } },
        },
      },
      logs: {
        orderBy: [{ type: "asc" }, { date: "asc" }, { createdAt: "asc" }],
        include: {
          machine: { select: { id: true, name: true, location: true } },
          technician: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!row) return null;

  const logs = row.logs.map(mapLog);
  const preventiveCount = logs.filter((l) => l.type === "PREVENTIVE").length;
  const correctiveCount = logs.filter((l) => l.type !== "PREVENTIVE").length;

  return {
    id: row.id,
    reference: row.reference,
    plannedDate: row.plannedDate.toISOString(),
    dayKey: row.dayKey,
    status: row.status,
    observationComment: row.observationComment,
    managerApproval: row.managerApproval,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    preventiveCount,
    correctiveCount,
    lines: row.lines.map((l) => ({
      id: l.id,
      machineId: l.machineId,
      machineName: l.machine.name,
      machineLocation: l.machine.location,
      taskNettoyage: l.taskNettoyage,
      taskGraissage: l.taskGraissage,
      taskHuile: l.taskHuile,
      taskControl: l.taskControl,
      taskNonConforme: l.taskNonConforme,
      completed: Boolean(l.maintenanceLog),
      maintenanceLogId: l.maintenanceLog?.id ?? null,
    })),
    logs,
  };
}
