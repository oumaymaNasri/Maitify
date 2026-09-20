import type { Prisma, WaterZone } from "@prisma/client";
import { unstable_cache } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache/tags";
import type { PaginatedResult, PaginationParams } from "@/lib/db/pagination";
import { clampPagination, paginatedMeta } from "@/lib/db/pagination";
import { prisma } from "@/lib/db/prisma";

export type WaterMeasurementRow = {
  id: string;
  zone: WaterZone;
  measuredAt: string;
  ph: number | null;
  th: number | null;
  conductivity: number | null;
  ta: number | null;
  tac: number | null;
  cl: number | null;
  notes: string | null;
};

const measurementSelect = {
  id: true,
  zone: true,
  measuredAt: true,
  ph: true,
  th: true,
  conductivity: true,
  ta: true,
  tac: true,
  cl: true,
  notes: true,
} as const;

function buildWhere(q: string): Prisma.WaterQualityMeasurementWhereInput {
  if (!q) return {};
  return {
    OR: [{ notes: { contains: q, mode: "insensitive" } }],
  };
}

export async function fetchWaterMeasurementsPage(
  params: PaginationParams,
): Promise<PaginatedResult<WaterMeasurementRow>> {
  const where = buildWhere(params.q);
  const { page, pageSize, skip } = clampPagination(params.page, params.pageSize);

  const [total, rows] = await Promise.all([
    prisma.waterQualityMeasurement.count({ where }),
    prisma.waterQualityMeasurement.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ measuredAt: "desc" }, { id: "desc" }],
      select: measurementSelect,
    }),
  ]);

  return {
    items: rows.map((m) => ({
      ...m,
      measuredAt: m.measuredAt.toISOString(),
    })),
    ...paginatedMeta(total, page, pageSize),
  };
}

export function getWaterMeasurementsPageCached(params: PaginationParams) {
  return unstable_cache(
    () => fetchWaterMeasurementsPage(params),
    [CACHE_TAGS.waterMeasurements, "p", String(params.page), String(params.pageSize), params.q],
    { revalidate: 45, tags: [CACHE_TAGS.waterMeasurements] },
  )();
}
