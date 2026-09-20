import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";

import { CACHE_TAGS } from "@/lib/cache/tags";
import { clampPagination, DEFAULT_PAGE_SIZE, paginatedMeta, type PaginatedResult } from "@/lib/db/pagination";
import { prisma } from "@/lib/db/prisma";

export type PartMachineVm = {
  id: string;
  name: string;
  legacyMatricule: number | null;
};

export type PartInventoryRow = {
  id: string;
  designation: string;
  brand: string | null;
  reference: string | null;
  quantity: number;
  minStock: number;
  hasImage: boolean;
  machines: PartMachineVm[];
  isLowStock: boolean;
};

const partSelect = {
  id: true,
  designation: true,
  brand: true,
  reference: true,
  quantity: true,
  minStock: true,
  imageUrl: true,
  machine: { select: { id: true, name: true, legacyMatricule: true } },
  partMachines: {
    select: {
      machine: { select: { id: true, name: true, legacyMatricule: true } },
    },
  },
} as const;

function mapPartRow(p: {
  id: string;
  designation: string;
  brand: string | null;
  reference: string | null;
  quantity: number;
  minStock: number;
  imageUrl: string | null;
  machine: PartMachineVm | null;
  partMachines: { machine: PartMachineVm }[];
}): PartInventoryRow {
  const machineMap = new Map<string, PartMachineVm>();
  for (const pm of p.partMachines) {
    machineMap.set(pm.machine.id, pm.machine);
  }
  if (p.machine && !machineMap.has(p.machine.id)) {
    machineMap.set(p.machine.id, p.machine);
  }
  const machines = Array.from(machineMap.values()).sort((a, b) => a.name.localeCompare(b.name, "fr"));

  return {
    id: p.id,
    designation: p.designation,
    brand: p.brand,
    reference: p.reference,
    quantity: p.quantity,
    minStock: p.minStock,
    hasImage: Boolean(p.imageUrl?.trim()),
    machines,
    isLowStock: p.quantity <= p.minStock,
  };
}

function inventoryWhere(filters?: { q?: string; machineId?: string }): Prisma.SparePartWhereInput {
  const and: Prisma.SparePartWhereInput[] = [];
  const q = filters?.q?.trim();
  if (q) {
    and.push({
      OR: [
        { designation: { contains: q, mode: "insensitive" } },
        { reference: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
        { machine: { name: { contains: q, mode: "insensitive" } } },
      ],
    });
  }
  if (filters?.machineId && filters.machineId !== "ALL") {
    and.push({
      OR: [{ machineId: filters.machineId }, { partMachines: { some: { machineId: filters.machineId } } }],
    });
  }
  return and.length ? { AND: and } : {};
}

export async function fetchPartsInventoryPage(
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  filters?: { q?: string; machineId?: string },
): Promise<PaginatedResult<PartInventoryRow>> {
  const where = inventoryWhere(filters);
  const { page: safePage, pageSize: limit, skip } = clampPagination(page, pageSize);
  const [total, rows] = await Promise.all([
    prisma.sparePart.count({ where }),
    prisma.sparePart.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ designation: "asc" }, { id: "asc" }],
      select: partSelect,
    }),
  ]);
  return { items: rows.map(mapPartRow), ...paginatedMeta(total, safePage, limit) };
}

export async function fetchPartsInventory(): Promise<PartInventoryRow[]> {
  const rows = await prisma.sparePart.findMany({
    orderBy: [{ designation: "asc" }, { id: "asc" }],
    select: partSelect,
  });
  return rows.map(mapPartRow);
}

export function getPartsInventoryCached(page = 1, pageSize = DEFAULT_PAGE_SIZE, q = "", machineId = "ALL") {
  return unstable_cache(
    () => fetchPartsInventoryPage(page, pageSize, { q, machineId }),
    [CACHE_TAGS.parts, CACHE_TAGS.stock, "inv-v2", String(page), String(pageSize), q, machineId],
    { revalidate: 60, tags: [CACHE_TAGS.parts, CACHE_TAGS.stock] },
  )();
}

export type MachineOption = {
  id: string;
  name: string;
  location: string;
};

export async function fetchMachineOptionsForParts(): Promise<MachineOption[]> {
  return prisma.machine.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, location: true },
  });
}

export function getMachineOptionsForPartsCached() {
  return unstable_cache(() => fetchMachineOptionsForParts(), [CACHE_TAGS.machines, "part-machine-options"], {
    revalidate: 120,
    tags: [CACHE_TAGS.machines],
  })();
}
