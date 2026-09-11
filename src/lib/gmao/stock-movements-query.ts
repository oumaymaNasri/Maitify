import type { StockMovementType } from "@prisma/client";
import { unstable_cache } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache/tags";
import { prisma } from "@/lib/db/prisma";

export type StockMovementRow = {
  id: string;
  partId: string;
  partDesignation: string;
  partReference: string | null;
  partBrand: string | null;
  type: StockMovementType;
  quantity: number;
  date: string;
  motif: string | null;
};

export async function fetchStockMovements(): Promise<StockMovementRow[]> {
  const rows = await prisma.stockMovement.findMany({
    take: 40,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      partId: true,
      type: true,
      quantity: true,
      date: true,
      motif: true,
      part: { select: { designation: true, reference: true, brand: true } },
    },
  });

  return rows.map((m) => ({
    id: m.id,
    partId: m.partId,
    partDesignation: m.part.designation,
    partReference: m.part.reference,
    partBrand: m.part.brand,
    type: m.type,
    quantity: m.quantity,
    date: m.date.toISOString(),
    motif: m.motif,
  }));
}

export function getStockMovementsCached() {
  return unstable_cache(() => fetchStockMovements(), [CACHE_TAGS.stock, "stock-movements"], {
    revalidate: 60,
    tags: [CACHE_TAGS.stock],
  })();
}
