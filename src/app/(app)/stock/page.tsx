import { DbErrorHint } from "@/components/layout/DbError";
import { StockModuleClient } from "@/components/stock/stock-module-client";
import {
  getMachineOptionsForPartsCached,
  getPartsInventoryCached,
} from "@/lib/gmao/stock-parts-query";
import { getStockMovementsCached } from "@/lib/gmao/stock-movements-query";
import { parsePageSize } from "@/lib/db/pagination";

type PageProps = {
  searchParams?: { page?: string; pageSize?: string; q?: string; machineId?: string };
};

export default async function StockPage({ searchParams }: PageProps) {
  try {
    const page = Math.max(1, Number.parseInt(searchParams?.page ?? "1", 10) || 1);
    const pageSize = parsePageSize(searchParams?.pageSize);
    const q = searchParams?.q?.trim() ?? "";
    const machineId = searchParams?.machineId ?? "ALL";
    const [partsPage, movements, machines] = await Promise.all([
      getPartsInventoryCached(page, pageSize, q, machineId),
      getStockMovementsCached(),
      getMachineOptionsForPartsCached(),
    ]);

    return (
      <StockModuleClient
        parts={partsPage.items}
        movements={movements}
        machines={machines}
        pagination={{ page: partsPage.page, pageCount: partsPage.pageCount, total: partsPage.total, pageSize: partsPage.pageSize }}
      />
    );
  } catch (e) {
    return (
      <div className="gmao-module-page density-page-inner py-8">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Stock & pièces de rechange</h1>
        <DbErrorHint detail={e instanceof Error ? e.message : String(e)} />
      </div>
    );
  }
}
