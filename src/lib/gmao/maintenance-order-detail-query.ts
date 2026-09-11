import type { InterventionType, MaintenanceOrderStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export type MaintenanceOrderDetailVm = {
  id: string;
  reference: string;
  plannedDate: string;
  interventionType: InterventionType;
  status: MaintenanceOrderStatus;
  observationComment: string | null;
  managerApproval: string | null;
  createdAt: string;
  updatedAt: string;
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
};

export async function fetchMaintenanceOrderDetail(id: string): Promise<MaintenanceOrderDetailVm | null> {
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
    },
  });

  if (!row) return null;

  return {
    id: row.id,
    reference: row.reference,
    plannedDate: row.plannedDate.toISOString(),
    interventionType: row.interventionType,
    status: row.status,
    observationComment: row.observationComment,
    managerApproval: row.managerApproval,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
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
  };
}
