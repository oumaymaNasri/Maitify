import type { MaintenanceFrequency } from "@prisma/client";
import { unstable_cache } from "next/cache";

import type { MachineCardVm } from "@/components/machines/machine-card";
import { CACHE_TAGS } from "@/lib/cache/tags";
import type { PaginatedResult } from "@/lib/db/pagination";
import { prisma } from "@/lib/db/prisma";

export const MACHINES_PAGE_SIZE = 10;

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

export async function fetchMachinesPage(page = 1, pageSize = MACHINES_PAGE_SIZE): Promise<PaginatedResult<MachineCardVm>> {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, Math.min(pageSize, 50));
  const skip = (safePage - 1) * safeLimit;

  const [total, list] = await Promise.all([
    prisma.machine.count(),
    prisma.machine.findMany({
      skip,
      take: safeLimit,
      orderBy: { name: "asc" },
      select: machineListSelect,
    }),
  ]);

  return {
    items: list.map(mapMachineCard),
    total,
    page: safePage,
    pageSize: safeLimit,
    pageCount: Math.max(1, Math.ceil(total / safeLimit) || 1),
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

export function getMachinesInventoryCached(page = 1, pageSize = MACHINES_PAGE_SIZE) {
  return unstable_cache(() => fetchMachinesPage(page, pageSize), [CACHE_TAGS.machines, String(page), String(pageSize)], {
    revalidate: 120,
    tags: [CACHE_TAGS.machines],
  })();
}

export function getAllMachinesInventoryCached() {
  return unstable_cache(() => fetchAllMachinesInventory(), [CACHE_TAGS.machines, "all-v1"], {
    revalidate: 120,
    tags: [CACHE_TAGS.machines],
  })();
}
