import { DbErrorHint } from "@/components/layout/DbError";
import { MaintenanceOrdersModuleClient } from "@/components/maintenance-orders/maintenance-orders-module-client";
import { getMaintenanceOrdersCached, MAINTENANCE_ORDERS_PAGE_SIZE } from "@/lib/gmao/maintenance-orders-query";
import { getMachineOptionsForPartsCached } from "@/lib/gmao/stock-parts-query";
import { getSession } from "@/lib/auth/session-server";
import { canManage } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams?: {
    q?: string;
    status?: string;
    machineId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
  };
};

export default async function MaintenanceOrdersPage({ searchParams }: PageProps) {
  try {
    const session = getSession();
    const readOnly = session ? !canManage(session) : true;
    const page = Math.max(1, Number.parseInt(searchParams?.page ?? "1", 10) || 1);
    const filters = {
      q: searchParams?.q?.trim() ?? "",
      status: searchParams?.status ?? "ALL",
      machineId: searchParams?.machineId ?? "ALL",
      dateFrom: searchParams?.dateFrom ?? "",
      dateTo: searchParams?.dateTo ?? "",
    };

    const [paginated, machineRows] = await Promise.all([
      getMaintenanceOrdersCached(filters, page, MAINTENANCE_ORDERS_PAGE_SIZE),
      getMachineOptionsForPartsCached(),
    ]);

    return (
      <MaintenanceOrdersModuleClient
        orders={paginated.items}
        initialFilters={{ ...filters, page }}
        pagination={{ page: paginated.page, pageCount: paginated.pageCount, total: paginated.total }}
        machines={machineRows}
        readOnly={readOnly}
      />
    );
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return (
      <div className="gmao-module-page density-page-inner py-8">
        <DbErrorHint detail={err} />
      </div>
    );
  }
}
