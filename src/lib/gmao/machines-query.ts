import type { MachineAssetStatus, MaintenanceFrequency, Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";

import type { MachineCardVm } from "@/components/machines/machine-card";
import { CACHE_TAGS } from "@/lib/cache/tags";
import type { PaginatedResult } from "@/lib/db/pagination";
import { clampPagination, paginatedMeta } from "@/lib/db/pagination";
import { prisma } from "@/lib/db/prisma";

export const MACHINES_PAGE_SIZE = 50;

const machineListSelect = {
  id: true,
  name: true,
  location: true,
  legacyMatricule: true,
  targetAvailability: true,
  assetStatus: true,
  qrCode: true,
  maintenanceSector: true,
  galleryImageUrls: true,
  _count: { select: { photos: true, maintenanceLogs: true } },
} as const;

function mapMachineCard(m: {
  id: string;
  name: string;
  location: string;
  legacyMatricule: number | null;
  targetAvailability: number | null;
  assetStatus: MachineCardVm["assetStatus"];
  qrCode: string | null;
  maintenanceSector: MaintenanceFrequency;
  galleryImageUrls: string[];
  _count: { photos: number; maintenanceLogs: number };
}): MachineCardVm {
  return {
    id: m.id,
    name: m.name,
    location: m.location,
    legacyMatricule: m.legacyMatricule,
    targetAvailability: m.targetAvailability ?? null,
    assetStatus: m.assetStatus,
    maintenanceSector: m.maintenanceSector,
    hasCoverImage: m._count.photos > 0 || m.galleryImageUrls.some((u) => Boolean(u?.trim())),
    interventionCount: m._count.maintenanceLogs,
    galleryCount: m._count.photos,
    qrCode: m.qrCode,
    lastInterventionAt: null,
  };
}

export type MachineListFilters = {
  q?: string;
  status?: string;
  location?: string;
  sector?: string;
  machineId?: string;
};

function machinesWhere(filters?: MachineListFilters): Prisma.MachineWhereInput {
  const and: Prisma.MachineWhereInput[] = [];
  const q = filters?.q?.trim();
  if (q) {
    const matricule = Number.parseInt(q.replace(/^m/i, ""), 10);
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { location: { contains: q, mode: "insensitive" } },
        { id: { contains: q, mode: "insensitive" } },
        ...(Number.isFinite(matricule) ? [{ legacyMatricule: matricule }] : []),
      ],
    });
  }
  if (filters?.status && filters.status !== "ALL") {
    and.push({ assetStatus: filters.status as MachineAssetStatus });
  }
  if (filters?.location && filters.location !== "ALL") {
    and.push({ location: filters.location });
  }
  if (filters?.sector && filters.sector !== "ALL") {
    and.push({ maintenanceSector: filters.sector as MaintenanceFrequency });
  }
  if (filters?.machineId && filters.machineId !== "ALL") {
    and.push({ id: filters.machineId });
  }
  return and.length ? { AND: and } : {};
}

export async function fetchMachinesPage(
  page = 1,
  pageSize = MACHINES_PAGE_SIZE,
  filters?: MachineListFilters,
): Promise<PaginatedResult<MachineCardVm>> {
  const { page: safePage, pageSize: limit, skip } = clampPagination(page, pageSize);
  const where = machinesWhere(filters);

  const [total, list] = await Promise.all([
    prisma.machine.count({ where }),
    prisma.machine.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
      select: machineListSelect,
    }),
  ]);

  return {
    items: list.map(mapMachineCard),
    ...paginatedMeta(total, safePage, limit),
  };
}

export async function fetchAllMachinesInventory(): Promise<MachineCardVm[]> {
  const list = await prisma.machine.findMany({
    orderBy: { name: "asc" },
    select: machineListSelect,
  });
  return list.map(mapMachineCard);
}

export async function fetchMachinesInventory(): Promise<MachineCardVm[]> {
  return fetchAllMachinesInventory();
}

export function getMachinesInventoryCached(
  page = 1,
  pageSize = MACHINES_PAGE_SIZE,
  filters?: MachineListFilters,
) {
  return unstable_cache(
    () => fetchMachinesPage(page, pageSize, filters),
    [
      CACHE_TAGS.machines,
      String(page),
      String(pageSize),
      filters?.q ?? "",
      filters?.status ?? "ALL",
      filters?.location ?? "ALL",
      filters?.sector ?? "ALL",
      filters?.machineId ?? "ALL",
    ],
    { revalidate: 120, tags: [CACHE_TAGS.machines] },
  )();
}

export function getAllMachinesInventoryCached() {
  return unstable_cache(() => fetchAllMachinesInventory(), [CACHE_TAGS.machines, "all-v1"], {
    revalidate: 120,
    tags: [CACHE_TAGS.machines],
  })();
}
