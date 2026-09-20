import { DbErrorHint } from "@/components/layout/DbError";
import { MaintenanceOrdersModuleClient } from "@/components/maintenance-orders/maintenance-orders-module-client";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { prisma } from "@/lib/db/prisma";
import { reconcileMaintenanceCatalog } from "@/lib/gmao/maintenance-catalog-reconcile";
import { fetchMaintenanceOrdersPage } from "@/lib/gmao/maintenance-orders-query";
import { getMachineOptionsForPartsCached } from "@/lib/gmao/stock-parts-query";
import { getSession } from "@/lib/auth/session-server";
import { canManage } from "@/lib/auth/session";
import { revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

    await reconcileMaintenanceCatalog(prisma);
    revalidateTag(CACHE_TAGS.maintenanceOrders);
    revalidateTag(CACHE_TAGS.interventions);
    revalidateTag(CACHE_TAGS.dashboard);

    const [paginated, machineRows] = await Promise.all([
      fetchMaintenanceOrdersPage(filters),
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
