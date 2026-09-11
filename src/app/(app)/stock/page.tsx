import { DbErrorHint } from "@/components/layout/DbError";
import { StockModuleClient } from "@/components/stock/stock-module-client";
import {
  getMachineOptionsForPartsCached,
  getPartsInventoryCached,
} from "@/lib/gmao/stock-parts-query";
import { getStockMovementsCached } from "@/lib/gmao/stock-movements-query";

export default async function StockPage() {
  try {
    const [parts, movements, machines] = await Promise.all([
      getPartsInventoryCached(),
      getStockMovementsCached(),
      getMachineOptionsForPartsCached(),
    ]);

    return <StockModuleClient parts={parts} movements={movements} machines={machines} />;
  } catch (e) {
    return (
      <div className="gmao-module-page density-page-inner py-8">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Stock & pièces de rechange</h1>
        <DbErrorHint detail={e instanceof Error ? e.message : String(e)} />
      </div>
    );
  }
}
