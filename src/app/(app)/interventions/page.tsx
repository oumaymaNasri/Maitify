import { DbErrorHint } from "@/components/layout/DbError";
import { InterventionsModuleClient } from "@/components/interventions/interventions-module-client";
import type { MachineOption, TechnicianOption } from "@/components/interventions/InterventionIntelligentForm";
import {
  fetchInterventionCatalogCount,
  getInterventionSectorsCached,
  getInterventionsInventoryCached,
  getInterventionMachineOptionsCached,
  getInterventionTechnicianOptionsCached,
  type InterventionSortKey,
} from "@/lib/gmao/interventions-query";
import { getSession } from "@/lib/auth/session-server";
import { prisma } from "@/lib/db/prisma";
import { syncDailyMaintenanceOrders } from "@/lib/gmao/maintenance-order-from-logs";
import { InterventionType, MaintenanceWorkflowStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams?: {
    q?: string;
    type?: string;
    status?: string;
    sector?: string;
    technicianId?: string;
    dateFrom?: string;
    dateTo?: string;
    sort?: string;
    dir?: string;
    view?: string;
  };
};

function parseType(raw?: string): InterventionType | "ALL" {
  if (raw === "PREVENTIVE" || raw === "CORRECTIVE" || raw === "AMELIORATION") return raw;
  return "ALL";
}

function parseStatus(raw?: string): MaintenanceWorkflowStatus | "ALL" {
  if (raw === "OPEN" || raw === "COMPLETED") return raw;
  return "ALL";
}

function parseSort(raw?: string): InterventionSortKey {
  if (raw === "machineName" || raw === "type" || raw === "importMatricule" || raw === "durationMinutes" || raw === "technicianName") {
    return raw;
  }
  return "date";
}

export default async function InterventionsPage({ searchParams }: PageProps) {
  try {
    const session = getSession();
    const isTechnician = session?.role === "TECHNICIEN";
    const technicianScopeId = isTechnician ? session?.technicianId : null;

    const type = parseType(searchParams?.type);
    await syncDailyMaintenanceOrders(prisma);

    const status = parseStatus(searchParams?.status);
    const sort = parseSort(searchParams?.sort);
    const dir = searchParams?.dir === "asc" ? "asc" : "desc";
    const q = (searchParams?.q ?? "").trim();
    const sector = searchParams?.sector ?? "ALL";
    const technicianId = isTechnician ? "ALL" : (searchParams?.technicianId ?? "ALL");
    const dateFrom = searchParams?.dateFrom ?? "";
    const dateTo = searchParams?.dateTo ?? "";
    const importView = searchParams?.view === "import" && !isTechnician;

    const [inventory, machineRows, techRows, sectors] = await Promise.all([
      importView
        ? fetchInterventionCatalogCount().then((catalogTotal) => ({
            items: [] as Awaited<ReturnType<typeof getInterventionsInventoryCached>>["items"],
            total: catalogTotal,
            catalogTotal,
            typeCounts: { preventive: 0, corrective: 0 },
          }))
        : getInterventionsInventoryCached(technicianScopeId),
      getInterventionMachineOptionsCached(),
      getInterventionTechnicianOptionsCached(),
      getInterventionSectorsCached(),
    ]);

    const machines: MachineOption[] = machineRows;
    const technicians: TechnicianOption[] = techRows.map((t) => ({
      id: t.id,
      label: `${t.firstName} ${t.lastName}`,
      availability: t.availability,
    }));

    return (
      <InterventionsModuleClient
        interventions={inventory.items}
        totals={{
          total: inventory.total,
          catalogTotal: inventory.catalogTotal,
          preventive: inventory.typeCounts.preventive,
          corrective: inventory.typeCounts.corrective,
        }}
        machines={machines}
        technicians={technicians}
        sectors={sectors}
        readOnly={isTechnician}
        query={{
          q,
          type,
          status,
          sector,
          technicianId,
          dateFrom,
          dateTo,
          sort,
          dir,
          view: searchParams?.view === "import" ? "import" : "",
        }}
      />
    );
  } catch (e) {
    return (
      <div className="gmao-module-page density-page-inner py-8">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Liste de Maintenance</h1>
        <DbErrorHint detail={e instanceof Error ? e.message : String(e)} />
      </div>
    );
  }
}
