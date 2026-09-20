import type { InterventionType, MachineAssetStatus, MaintenanceWorkflowStatus, Prisma } from "@prisma/client";

import type { PaginatedResult } from "@/lib/db/pagination";
import { prisma } from "@/lib/db/prisma";
import { workflowStatusForLog } from "@/lib/gmao/intervention-status";

const historyLogSelect = {
  id: true,
  date: true,
  type: true,
  importSource: true,
  failureDescription: true,
  workPerformed: true,
  workflowStatus: true,
  technician: { select: { firstName: true, lastName: true } },
  maintenanceOrderLine: {
    select: { maintenanceOrder: { select: { reference: true } } },
  },
} satisfies Prisma.MaintenanceLogSelect;

type HistoryLogRow = Prisma.MaintenanceLogGetPayload<{ select: typeof historyLogSelect }>;

export type MachineHistoryHeader = {
  id: string;
  name: string;
  code: string;
  location: string;
  assetStatus: MachineAssetStatus;
};

export type MachineHistoryRow = {
  id: string;
  date: string;
  referenceCode: string;
  type: InterventionType;
  technicianName: string | null;
  description: string;
  workflowStatus: MaintenanceWorkflowStatus;
};

function mapTechnicianName(tech: { firstName: string; lastName: string } | null): string | null {
  if (!tech) return null;
  const name = `${tech.firstName} ${tech.lastName}`.trim();
  return name || null;
}

function mapReferenceCode(row: Pick<HistoryLogRow, "id" | "importSource" | "maintenanceOrderLine">): string {
  return row.importSource ?? row.maintenanceOrderLine?.maintenanceOrder.reference ?? row.id.slice(0, 8);
}

function mapDescription(failureDescription: string | null, workPerformed: string): string {
  const failure = failureDescription?.trim();
  if (failure) return failure;
  const work = workPerformed.trim();
  return work || "—";
}

function mapHistoryRow(row: HistoryLogRow): MachineHistoryRow {
  return {
    id: row.id,
    date: row.date.toISOString(),
    referenceCode: mapReferenceCode(row),
    type: row.type,
    technicianName: mapTechnicianName(row.technician),
    description: mapDescription(row.failureDescription, row.workPerformed),
    workflowStatus: workflowStatusForLog(row.type, row.date),
  };
}

export async function fetchMachineHistoryHeader(machineId: string): Promise<MachineHistoryHeader | null> {
  const machine = await prisma.machine.findUnique({
    where: { id: machineId },
    select: {
      id: true,
      name: true,
      location: true,
      legacyMatricule: true,
      assetStatus: true,
    },
  });

  if (!machine) return null;

  return {
    id: machine.id,
    name: machine.name,
    code: machine.legacyMatricule != null ? `M${machine.legacyMatricule}` : machine.id.slice(0, 8),
    location: machine.location,
    assetStatus: machine.assetStatus,
  };
}

export async function fetchMachineHistoryPage(
  machineId: string,
): Promise<PaginatedResult<MachineHistoryRow> | null> {
  const exists = await prisma.machine.findUnique({
    where: { id: machineId },
    select: { id: true },
  });
  if (!exists) return null;

  const [total, rows] = await prisma.$transaction([
    prisma.maintenanceLog.count({ where: { machineId } }),
    prisma.maintenanceLog.findMany({
      where: { machineId },
      orderBy: { date: "desc" },
      take: 20_000,
      select: historyLogSelect,
    }),
  ]);

  return {
    items: rows.map(mapHistoryRow),
    total,
    page: 1,
    pageSize: total || 1,
    pageCount: 1,
  };
}

export async function fetchMachineHistoryExportRows(machineId: string): Promise<MachineHistoryRow[] | null> {
  const exists = await prisma.machine.findUnique({
    where: { id: machineId },
    select: { id: true },
  });
  if (!exists) return null;

  const rows = await prisma.maintenanceLog.findMany({
    where: { machineId },
    orderBy: { date: "desc" },
    select: historyLogSelect,
  });

  return rows.map(mapHistoryRow);
}
