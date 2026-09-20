import { DbErrorHint } from "@/components/layout/DbError";
import { MaintenanceOrdersModuleClient } from "@/components/maintenance-orders/maintenance-orders-module-client";
import { getMaintenanceOrdersCached } from "@/lib/gmao/maintenance-orders-query";
import { getMachineOptionsForPartsCached } from "@/lib/gmao/stock-parts-query";
import { getSession } from "@/lib/auth/session-server";
import { canManage } from "@/lib/auth/session";

type PageProps = {
  searchParams?: {
    q?: string;
    status?: string;
    machineId?: string;
    dateFrom?: string;
    dateTo?: string;
  };
};

export default async function MaintenanceOrdersPage({ searchParams }: PageProps) {
  try {
    const session = getSession();
    const readOnly = session ? !canManage(session) : true;
    const filters = {
      q: searchParams?.q?.trim() ?? "",
      status: searchParams?.status ?? "ALL",
      machineId: searchParams?.machineId ?? "ALL",
      dateFrom: searchParams?.dateFrom ?? "",
      dateTo: searchParams?.dateTo ?? "",
    };

    const [paginated, machineRows] = await Promise.all([
      getMaintenanceOrdersCached(filters),
      getMachineOptionsForPartsCached(),
    ]);

    return (
      <MaintenanceOrdersModuleClient
        orders={paginated.items}
        initialFilters={filters}
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
