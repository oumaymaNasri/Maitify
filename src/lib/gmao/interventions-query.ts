import type { OperationType, Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";

import type { InterventionListVm } from "@/components/interventions/intervention-types";
import { CACHE_TAGS } from "@/lib/cache/tags";
import type { PaginatedResult, PaginationParams } from "@/lib/db/pagination";
import { prisma } from "@/lib/db/prisma";

export const INTERVENTIONS_PAGE_SIZE = 10;

/** Champs légers pour listes / filtres client — sans textes longs ni blobs. */
const listSelect = {
  id: true,
  date: true,
  operationType: true,
  workflowStatus: true,
  durationMinutes: true,
  importSource: true,
  operation: true,
  machineId: true,
  machine: { select: { name: true, location: true } },
  technicianId: true,
  technician: { select: { firstName: true, lastName: true } },
} as const;

function mapListRows(
  rows: {
    id: string;
    date: Date;
    operationType: OperationType;
    workflowStatus: InterventionListVm["workflowStatus"];
    durationMinutes: number | null;
    importSource: string | null;
    operation: string | null;
    machineId: string;
    machine: { name: string; location: string };
    technicianId: string | null;
    technician: { firstName: string; lastName: string } | null;
  }[],
): InterventionListVm[] {
  return rows.map((r) => ({
    id: r.id,
    date: r.date.toISOString(),
    operationType: r.operationType,
    workflowStatus: r.workflowStatus,
    failureDescription: null,
    workPerformed: "",
    machineId: r.machineId,
    machineName: r.machine.name,
    machineLocation: r.machine.location,
    technicianId: r.technicianId,
    technicianName: r.technician ? `${r.technician.firstName} ${r.technician.lastName}` : null,
    durationMinutes: r.durationMinutes,
    importSource: r.importSource,
    operation: r.operation,
  }));
}

function buildWhere(q: string): Prisma.MaintenanceLogWhereInput {
  if (!q) return {};
  return {
    OR: [
      { machine: { name: { contains: q, mode: "insensitive" } } },
      { failureDescription: { contains: q, mode: "insensitive" } },
      { workPerformed: { contains: q, mode: "insensitive" } },
      { operation: { contains: q, mode: "insensitive" } },
      { importSource: { contains: q, mode: "insensitive" } },
      { technician: { firstName: { contains: q, mode: "insensitive" } } },
      { technician: { lastName: { contains: q, mode: "insensitive" } } },
    ],
  };
}

function scopeWhere(technicianId?: string | null): Prisma.MaintenanceLogWhereInput {
  return technicianId ? { technicianId } : {};
}

export async function fetchInterventionsInventory(
  technicianId?: string | null,
  page = 1,
  limit = INTERVENTIONS_PAGE_SIZE,
): Promise<PaginatedResult<InterventionListVm>> {
  const where = scopeWhere(technicianId);
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, Math.min(limit, 50));
  const skip = (safePage - 1) * safeLimit;

  const [total, rows] = await Promise.all([
    prisma.maintenanceLog.count({ where }),
    prisma.maintenanceLog.findMany({
      where,
      skip,
      take: safeLimit,
      orderBy: [{ date: "desc" }, { id: "desc" }],
      select: listSelect,
    }),
  ]);

  return {
    items: mapListRows(rows),
    total,
    page: safePage,
    pageSize: safeLimit,
    pageCount: Math.max(1, Math.ceil(total / safeLimit) || 1),
  };
}

/** Export CSV/PDF — toutes les fiches (hors pagination UI). */
export async function fetchAllInterventionsInventory(technicianId?: string | null): Promise<InterventionListVm[]> {
  const where = scopeWhere(technicianId);
  const rows = await prisma.maintenanceLog.findMany({
    where,
    orderBy: [{ date: "desc" }, { id: "desc" }],
    select: listSelect,
  });
  return mapListRows(rows);
}

export function getInterventionsInventoryCached(
  technicianId?: string | null,
  page = 1,
  limit = INTERVENTIONS_PAGE_SIZE,
) {
  const scope = technicianId ?? "all";
  return unstable_cache(
    () => fetchInterventionsInventory(technicianId, page, limit),
    [CACHE_TAGS.interventions, scope, String(page), String(limit)],
    { revalidate: 30, tags: [CACHE_TAGS.interventions] },
  )();
}

export type InterventionMachineOption = {
  id: string;
  name: string;
  legacyMatricule: number | null;
};

export type InterventionTechnicianOption = {
  id: string;
  firstName: string;
  lastName: string;
  availability: string;
};

export async function fetchInterventionMachineOptions(): Promise<InterventionMachineOption[]> {
  return prisma.machine.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, legacyMatricule: true },
  });
}

export async function fetchInterventionTechnicianOptions(): Promise<InterventionTechnicianOption[]> {
  return prisma.technician.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true, availability: true },
  });
}

export function getInterventionMachineOptionsCached() {
  return unstable_cache(
    () => fetchInterventionMachineOptions(),
    [CACHE_TAGS.machines, "intervention-form-options"],
    { revalidate: 120, tags: [CACHE_TAGS.machines] },
  )();
}

export function getInterventionTechnicianOptionsCached() {
  return unstable_cache(
    () => fetchInterventionTechnicianOptions(),
    [CACHE_TAGS.technicians, "intervention-form-options"],
    { revalidate: 60, tags: [CACHE_TAGS.technicians] },
  )();
}

export type InterventionRow = InterventionListVm;

export async function fetchInterventionsPage(params: PaginationParams): Promise<PaginatedResult<InterventionListVm>> {
  const where = buildWhere(params.q);
  const skip = (params.page - 1) * params.pageSize;

  const [total, rows] = await Promise.all([
    prisma.maintenanceLog.count({ where }),
    prisma.maintenanceLog.findMany({
      where,
      skip,
      take: params.pageSize,
      orderBy: [{ date: "desc" }, { id: "desc" }],
      select: listSelect,
    }),
  ]);

  return {
    items: mapListRows(rows),
    total,
    page: params.page,
    pageSize: params.pageSize,
    pageCount: Math.max(1, Math.ceil(total / params.pageSize) || 1),
  };
}

export function getInterventionsPageCached(params: PaginationParams) {
  return unstable_cache(
    () => fetchInterventionsPage(params),
    [CACHE_TAGS.interventions, String(params.page), String(params.pageSize), params.q],
    { revalidate: 30, tags: [CACHE_TAGS.interventions] },
  )();
}
