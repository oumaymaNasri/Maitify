import type { MaintenanceFrequency } from "@prisma/client";
import { unstable_cache } from "next/cache";

import type { MachineCardVm } from "@/components/machines/machine-card";
import { CACHE_TAGS } from "@/lib/cache/tags";
import type { PaginatedResult } from "@/lib/db/pagination";
import { prisma } from "@/lib/db/prisma";

export const MACHINES_PAGE_SIZE = 10;

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
      select: {
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
      },
    }),
  ]);

  const items: MachineCardVm[] = list.map((m) => ({
    id: m.id,
    name: m.name,
    location: m.location,
    legacyMatricule: m.legacyMatricule,
    targetAvailability: m.targetAvailability ?? null,
    assetStatus: m.assetStatus,
    maintenanceSector: m.maintenanceSector as MaintenanceFrequency,
    hasCoverImage: m._count.photos > 0 || m.galleryImageUrls.some((u) => Boolean(u?.trim())),
    interventionCount: m._count.maintenanceLogs,
    galleryCount: m._count.photos,
    qrCode: m.qrCode,
    lastInterventionAt: null,
  }));

  return {
    items,
    total,
    page: safePage,
    pageSize: safeLimit,
    pageCount: Math.max(1, Math.ceil(total / safeLimit) || 1),
  };
}

export async function fetchMachinesInventory(): Promise<MachineCardVm[]> {
  const page = await fetchMachinesPage(1, MACHINES_PAGE_SIZE);
  return page.items;
}

export function getMachinesInventoryCached(page = 1, pageSize = MACHINES_PAGE_SIZE) {
  return unstable_cache(() => fetchMachinesPage(page, pageSize), [CACHE_TAGS.machines, String(page), String(pageSize)], {
    revalidate: 120,
    tags: [CACHE_TAGS.machines],
  })();
}
