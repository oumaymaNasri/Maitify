import type { FailureCause, InterventionType, OperationType, Prisma } from "@prisma/client";
import { MaintenanceWorkflowStatus } from "@prisma/client";
import { unstable_cache } from "next/cache";

import type { InterventionListVm } from "@/components/interventions/intervention-types";
import { CACHE_TAGS } from "@/lib/cache/tags";
import type { PaginatedResult, PaginationParams } from "@/lib/db/pagination";
import { ALL_PAGE_SIZE, clampPagination, paginatedMeta } from "@/lib/db/pagination";
import { prisma } from "@/lib/db/prisma";
import { workflowStatusForLog, workflowStatusWhere } from "@/lib/gmao/intervention-status";

export const INTERVENTIONS_PAGE_SIZE = 50;
export const INTERVENTIONS_LIST_CAP = ALL_PAGE_SIZE;

const LIST_TEXT_CLIP = 220;

const listSelect = {
  id: true,
  date: true,
  operationType: true,
  type: true,
  durationMinutes: true,
  importMatricule: true,
  linkedFailureCause: true,
  failureCauseLabel: true,
  sparePartsLabel: true,
  operation: true,
  sectorMaintenance: true,
  service: true,
  difficulties: true,
  failureDescription: true,
  workPerformed: true,
  failureCause: true,
  machineId: true,
  machine: { select: { name: true, location: true, legacyMatricule: true } },
  technicianId: true,
  technician: { select: { firstName: true, lastName: true } },
} as const;

function clipText(value: string | null | undefined, max = LIST_TEXT_CLIP): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max)}…`;
}

export type InterventionListFilters = {
  q?: string | null;
  type?: InterventionType | "ALL" | null;
  status?: MaintenanceWorkflowStatus | "ALL" | null;
  sector?: string | null;
  technicianId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  sort?: InterventionSortKey | null;
  dir?: "asc" | "desc" | null;
};

export type InterventionSortKey = "date" | "machineName" | "type" | "importMatricule" | "durationMinutes" | "technicianName";

function mapListRows(
  rows: {
    id: string;
    date: Date;
    operationType: OperationType;
    type: InterventionType;
    durationMinutes: number | null;
    importMatricule: string | null;
    linkedFailureCause: string | null;
    failureCauseLabel: string | null;
    sparePartsLabel: string | null;
    operation: string | null;
    sectorMaintenance: string | null;
    service: string | null;
    difficulties: string | null;
    failureDescription: string | null;
    workPerformed: string;
    failureCause: FailureCause | null;
    machineId: string;
    machine: { name: string; location: string; legacyMatricule: number | null };
    technicianId: string | null;
    technician: { firstName: string; lastName: string } | null;
  }[],
): InterventionListVm[] {
  return rows.map((r) => ({
    id: r.id,
    importMatricule: r.importMatricule || (r.machine.legacyMatricule != null ? String(r.machine.legacyMatricule) : r.id.slice(0, 8)),
    date: r.date.toISOString(),
    sectorMaintenance: r.sectorMaintenance,
    service: r.service,
    technicianId: r.technicianId,
    technicianName: r.technician ? `${r.technician.firstName} ${r.technician.lastName}` : null,
    machineId: r.machineId,
    machineName: r.machine.name,
    machineLocation: r.machine.location,
    failureDescription: clipText(r.failureDescription),
    operation: clipText(r.operation, 120),
    operationType: r.operationType,
    type: r.type,
    workflowStatus: workflowStatusForLog(r.type, r.date),
    failureCause: r.failureCause,
    failureCauseLabel: clipText(r.failureCauseLabel, 120),
    linkedFailureCause: clipText(r.linkedFailureCause),
    durationMinutes: r.durationMinutes,
    workPerformed: clipText(r.workPerformed) ?? "",
    difficulties: clipText(r.difficulties),
    sparePartsLabel: clipText(r.sparePartsLabel),
    importSource: null,
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
      { importMatricule: { contains: q, mode: "insensitive" } },
      { sectorMaintenance: { contains: q, mode: "insensitive" } },
      { service: { contains: q, mode: "insensitive" } },
      { technician: { firstName: { contains: q, mode: "insensitive" } } },
      { technician: { lastName: { contains: q, mode: "insensitive" } } },
    ],
  };
}

function filterWhere(filters?: InterventionListFilters): Prisma.MaintenanceLogWhereInput {
  const and: Prisma.MaintenanceLogWhereInput[] = [];
  const q = filters?.q?.trim();
  if (q) and.push(buildWhere(q));
  if (filters?.type && filters.type !== "ALL") and.push({ type: filters.type });
  if (filters?.status && filters.status !== "ALL") {
    and.push(workflowStatusWhere(filters.status) as Prisma.MaintenanceLogWhereInput);
  }
  if (filters?.sector && filters.sector !== "ALL") {
    and.push({ sectorMaintenance: { equals: filters.sector, mode: "insensitive" } });
  }
  if (filters?.technicianId && filters.technicianId !== "ALL") {
    and.push({ technicianId: filters.technicianId });
  }
  if (filters?.dateFrom) {
    const d = new Date(`${filters.dateFrom}T00:00:00.000Z`);
    if (!Number.isNaN(d.getTime())) and.push({ date: { gte: d } });
  }
  if (filters?.dateTo) {
    const d = new Date(`${filters.dateTo}T23:59:59.999Z`);
    if (!Number.isNaN(d.getTime())) and.push({ date: { lte: d } });
  }
  if (!and.length) return {};
  return { AND: and };
}

function scopeWhere(technicianId?: string | null): Prisma.MaintenanceLogWhereInput {
  return technicianId ? { technicianId } : {};
}

function inventoryWhere(
  technicianId?: string | null,
  filters?: InterventionListFilters,
): Prisma.MaintenanceLogWhereInput {
  const parts = [scopeWhere(technicianId), filterWhere(filters)].filter((w) => Object.keys(w).length > 0);
  if (!parts.length) return {};
  if (parts.length === 1) return parts[0]!;
  return { AND: parts };
}

function orderBy(filters?: InterventionListFilters): Prisma.MaintenanceLogOrderByWithRelationInput[] {
  const dir = filters?.dir === "asc" ? "asc" : "desc";
  switch (filters?.sort) {
    case "machineName":
      return [{ machine: { name: dir } }, { id: "desc" }];
    case "type":
      return [{ type: dir }, { date: "desc" }];
    case "importMatricule":
      return [{ importMatricule: dir }, { id: "desc" }];
    case "durationMinutes":
      return [{ durationMinutes: dir }, { date: "desc" }];
    case "technicianName":
      return [{ technician: { lastName: dir } }, { date: "desc" }];
    default:
      return [{ date: dir }, { id: "desc" }];
  }
}

export type InterventionsInventoryResult = PaginatedResult<InterventionListVm> & {
  catalogTotal: number;
  typeCounts: { preventive: number; corrective: number; all: number };
};

async function fetchTypeCounts(where: Prisma.MaintenanceLogWhereInput) {
  const grouped = await prisma.maintenanceLog.groupBy({
    by: ["type"],
    where,
    _count: { _all: true },
  });
  let preventive = 0;
  let corrective = 0;
  let all = 0;
  for (const row of grouped) {
    all += row._count._all;
    if (row.type === "PREVENTIVE") preventive = row._count._all;
    if (row.type === "CORRECTIVE") corrective = row._count._all;
  }
  return { preventive, corrective, all };
}

export async function fetchInterventionsInventory(
  technicianId?: string | null,
  page = 1,
  limit = INTERVENTIONS_PAGE_SIZE,
  filters?: InterventionListFilters,
): Promise<InterventionsInventoryResult> {
  const { page: safePage, pageSize, skip } = clampPagination(page, limit);
  const where = inventoryWhere(technicianId, filters);
  const tabWhere = inventoryWhere(technicianId, { ...filters, type: "ALL" });
  const catalogWhere = scopeWhere(technicianId);

  const [catalogTotal, typeCounts, total, rows] = await Promise.all([
    prisma.maintenanceLog.count({ where: catalogWhere }),
    fetchTypeCounts(tabWhere),
    prisma.maintenanceLog.count({ where }),
    prisma.maintenanceLog.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: orderBy(filters),
      select: listSelect,
    }),
  ]);

  return {
    items: mapListRows(rows),
    catalogTotal,
    typeCounts,
    ...paginatedMeta(total, safePage, pageSize),
  };
}

export async function fetchAllInterventionsInventory(
  technicianId?: string | null,
  filters?: InterventionListFilters,
): Promise<InterventionListVm[]> {
  const where = inventoryWhere(technicianId, filters);
  const rows = await prisma.maintenanceLog.findMany({
    where,
    orderBy: orderBy(filters),
    select: listSelect,
    take: INTERVENTIONS_LIST_CAP,
  });
  return mapListRows(rows);
}

export async function fetchInterventionSectors(): Promise<string[]> {
  const rows = await prisma.maintenanceLog.findMany({
    where: { sectorMaintenance: { not: null } },
    distinct: ["sectorMaintenance"],
    select: { sectorMaintenance: true },
    orderBy: { sectorMaintenance: "asc" },
    take: 80,
  });
  return rows.map((r) => r.sectorMaintenance).filter((s): s is string => Boolean(s?.trim()));
}

export function getInterventionSectorsCached() {
  return unstable_cache(
    () => fetchInterventionSectors(),
    [CACHE_TAGS.interventions, "sectors-v1"],
    { revalidate: 120, tags: [CACHE_TAGS.interventions] },
  )();
}

function catalogCacheKey(technicianId?: string | null, filters?: InterventionListFilters, page = 1, limit = INTERVENTIONS_PAGE_SIZE) {
  return JSON.stringify({
    scope: technicianId ?? "all",
    page,
    limit,
    q: filters?.q ?? "",
    type: filters?.type ?? "ALL",
    status: filters?.status ?? "ALL",
    sector: filters?.sector ?? "ALL",
    technicianId: filters?.technicianId ?? "ALL",
    dateFrom: filters?.dateFrom ?? "",
    dateTo: filters?.dateTo ?? "",
    sort: filters?.sort ?? "date",
    dir: filters?.dir ?? "desc",
  });
}

export function getInterventionsInventoryCached(
  technicianId?: string | null,
  page = 1,
  limit = INTERVENTIONS_PAGE_SIZE,
  filters?: InterventionListFilters,
) {
  return unstable_cache(
    () => fetchInterventionsInventory(technicianId, page, limit, filters),
    [CACHE_TAGS.interventions, "catalog-v3", catalogCacheKey(technicianId, filters, page, limit)],
    { revalidate: 60, tags: [CACHE_TAGS.interventions] },
  )();
}

export async function fetchInterventionCatalogCount(): Promise<number> {
  return prisma.maintenanceLog.count();
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
  return fetchInterventionsInventory(null, params.page, params.pageSize, { q: params.q });
}

export function getInterventionsPageCached(params: PaginationParams) {
  return unstable_cache(
    () => fetchInterventionsPage(params),
    [CACHE_TAGS.interventions, String(params.page), String(params.pageSize), params.q],
    { revalidate: 30, tags: [CACHE_TAGS.interventions] },
  )();
}
