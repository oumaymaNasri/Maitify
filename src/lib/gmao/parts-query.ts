import type { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache/tags";
import type { PaginatedResult, PaginationParams } from "@/lib/db/pagination";
import { prisma } from "@/lib/db/prisma";

export type SparePartRow = {
  id: string;
  designation: string;
  reference: string | null;
  brand: string | null;
  quantity: number;
  minStock: number;
  imageUrl: string | null;
  machineName: string | null;
  machineMatricule: number | null;
};

const partSelect = {
  id: true,
  designation: true,
  reference: true,
  brand: true,
  quantity: true,
  minStock: true,
  imageUrl: true,
  machine: { select: { name: true, legacyMatricule: true } },
} as const;

function buildWhere(q: string): Prisma.SparePartWhereInput {
  if (!q) return {};
  return {
    OR: [
      { designation: { contains: q, mode: "insensitive" } },
      { reference: { contains: q, mode: "insensitive" } },
      { brand: { contains: q, mode: "insensitive" } },
      { machine: { name: { contains: q, mode: "insensitive" } } },
    ],
  };
}

export async function fetchPartsPage(params: PaginationParams): Promise<PaginatedResult<SparePartRow>> {
  const where = buildWhere(params.q);

  const [total, rows] = await Promise.all([
    prisma.sparePart.count({ where }),
    prisma.sparePart.findMany({
      where,
      take: 20_000,
      orderBy: [{ designation: "asc" }, { id: "asc" }],
      select: partSelect,
    }),
  ]);

  return {
    items: rows.map((p) => ({
      id: p.id,
      designation: p.designation,
      reference: p.reference,
      brand: p.brand,
      quantity: p.quantity,
      minStock: p.minStock,
      imageUrl: p.imageUrl,
      machineName: p.machine?.name ?? null,
      machineMatricule: p.machine?.legacyMatricule ?? null,
    })),
    total,
    page: 1,
    pageSize: total || 1,
    pageCount: 1,
  };
}

export function getPartsPageCached(params: PaginationParams) {
  return unstable_cache(
    () => fetchPartsPage(params),
    [CACHE_TAGS.parts, "all", params.q],
    { revalidate: 60, tags: [CACHE_TAGS.parts] },
  )();
}
