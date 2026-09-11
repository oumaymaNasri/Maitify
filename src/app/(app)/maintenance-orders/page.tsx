import { DbErrorHint } from "@/components/layout/DbError";
import { MaintenanceOrdersModuleClient } from "@/components/maintenance-orders/maintenance-orders-module-client";
import {
  getMaintenanceOrdersCached,
  MAINTENANCE_ORDERS_PAGE_SIZE,
} from "@/lib/gmao/maintenance-orders-query";
import { getMachineOptionsForPartsCached } from "@/lib/gmao/stock-parts-query";
import { getSession } from "@/lib/auth/session-server";
import { canManage } from "@/lib/auth/session";

type PageProps = {
  searchParams?: { page?: string; q?: string; status?: string; type?: string };
};

export default async function MaintenanceOrdersPage({ searchParams }: PageProps) {
  try {
    const session = getSession();
    const readOnly = session ? !canManage(session) : true;
    const page = Math.max(1, Number.parseInt(searchParams?.page ?? "1", 10) || 1);
    const filters = {
      q: searchParams?.q?.trim() ?? "",
      status: searchParams?.status ?? "ALL",
      type: searchParams?.type ?? "ALL",
    };

    const [paginated, machineRows] = await Promise.all([
      getMaintenanceOrdersCached(page, MAINTENANCE_ORDERS_PAGE_SIZE, filters),
      getMachineOptionsForPartsCached(),
    ]);

    return (
      <MaintenanceOrdersModuleClient
        orders={paginated.items}
        pagination={{
          page: paginated.page,
          pageCount: paginated.pageCount,
          total: paginated.total,
          pageSize: paginated.pageSize,
        }}
        initialFilters={filters}
        machines={machineRows}
        readOnly={readOnly}
      />
    );
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return (
      <div className="gmao-module-page density-page-inner py-8">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Ordres de Maintenance</h1>
        <DbErrorHint detail={err} />
      </div>
    );
  }
}
