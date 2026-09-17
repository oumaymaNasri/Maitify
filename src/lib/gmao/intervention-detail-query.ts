import type { InterventionDetailVm } from "@/components/interventions/intervention-types";
import { prisma } from "@/lib/db/prisma";
import { workflowStatusForLog } from "@/lib/gmao/intervention-status";

const detailSelect = {
  id: true,
  date: true,
  operationType: true,
  type: true,
  workflowStatus: true,
  failureDescription: true,
  workPerformed: true,
  difficulties: true,
  durationMinutes: true,
  failureCause: true,
  signature: true,
  sectorMaintenance: true,
  service: true,
  operation: true,
  machine: { select: { id: true, name: true, location: true } },
  technician: { select: { id: true, firstName: true, lastName: true } },
  sparePartUsages: {
    select: {
      quantityUsed: true,
      sparePart: { select: { designation: true, brand: true, reference: true } },
    },
  },
} as const;

export async function fetchInterventionDetail(id: string): Promise<InterventionDetailVm | null> {
  const row = await prisma.maintenanceLog.findUnique({
    where: { id },
    select: detailSelect,
  });
  if (!row) return null;

  return {
    id: row.id,
    date: row.date.toISOString(),
    operationType: row.operationType,
    type: row.type,
    workflowStatus: workflowStatusForLog(row.type, row.date),
    failureDescription: row.failureDescription,
    workPerformed: row.workPerformed,
    difficulties: row.difficulties,
    durationMinutes: row.durationMinutes,
    failureCause: row.failureCause,
    signature: row.signature,
    sectorMaintenance: row.sectorMaintenance,
    service: row.service,
    operation: row.operation,
    machine: row.machine,
    technician: row.technician,
    sparePartLines: row.sparePartUsages.map((u) => ({
      designation: u.sparePart.designation,
      brand: u.sparePart.brand,
      reference: u.sparePart.reference,
      quantityUsed: u.quantityUsed,
    })),
  };
}
