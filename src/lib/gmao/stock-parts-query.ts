import { unstable_cache } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache/tags";
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

export async function fetchPartsInventory(): Promise<PartInventoryRow[]> {
  const rows = await prisma.sparePart.findMany({
    take: 100,
    orderBy: [{ designation: "asc" }, { id: "asc" }],
    select: partSelect,
  });
  return rows.map(mapPartRow);
}

export function getPartsInventoryCached() {
  return unstable_cache(() => fetchPartsInventory(), [CACHE_TAGS.parts, CACHE_TAGS.stock], {
    revalidate: 60,
    tags: [CACHE_TAGS.parts, CACHE_TAGS.stock],
  })();
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
