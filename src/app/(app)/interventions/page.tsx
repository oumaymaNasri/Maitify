import { DbErrorHint } from "@/components/layout/DbError";
import { InterventionsModuleClient } from "@/components/interventions/interventions-module-client";
import type { MachineOption, TechnicianOption } from "@/components/interventions/InterventionIntelligentForm";
import {
  fetchInterventionsInventory,
  getInterventionMachineOptionsCached,
  getInterventionTechnicianOptionsCached,
  INTERVENTIONS_PAGE_SIZE,
} from "@/lib/gmao/interventions-query";
import { getSession } from "@/lib/auth/session-server";
import { InterventionType, MaintenanceWorkflowStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams?: { page?: string; type?: string; status?: string };
};

function parseTypeFilter(raw?: string): InterventionType | "ALL" {
  if (raw === InterventionType.PREVENTIVE || raw === InterventionType.CORRECTIVE || raw === InterventionType.AMELIORATION) {
    return raw;
  }
  return "ALL";
}

function parseStatusFilter(raw?: string): MaintenanceWorkflowStatus | "ALL" {
  if (raw === MaintenanceWorkflowStatus.OPEN || raw === MaintenanceWorkflowStatus.COMPLETED) {
    return raw;
  }
  return "ALL";
}

export default async function InterventionsPage({ searchParams }: PageProps) {
  try {
    const session = getSession();
    const isTechnician = session?.role === "TECHNICIEN";
    const technicianScopeId = isTechnician ? session?.technicianId : null;

    const page = Math.max(1, Number.parseInt(searchParams?.page ?? "1", 10) || 1);
    const typeFilter = parseTypeFilter(searchParams?.type);
    const statusFilter = parseStatusFilter(searchParams?.status);

    const [paginated, machineRows, techRows] = await Promise.all([
      fetchInterventionsInventory(technicianScopeId, page, INTERVENTIONS_PAGE_SIZE, {
        type: typeFilter,
        status: statusFilter,
      }),
      getInterventionMachineOptionsCached(),
      getInterventionTechnicianOptionsCached(),
    ]);

    const machines: MachineOption[] = machineRows;
    const technicians: TechnicianOption[] = techRows.map((t) => ({
      id: t.id,
      label: `${t.firstName} ${t.lastName}`,
      availability: t.availability,
    }));

    return (
      <InterventionsModuleClient
        interventions={paginated.items}
        pagination={{
          page: paginated.page,
          pageCount: paginated.pageCount,
          total: paginated.total,
          pageSize: paginated.pageSize,
        }}
        machines={machines}
        technicians={technicians}
        readOnly={isTechnician}
        typeFilter={typeFilter}
        statusFilter={statusFilter}
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
