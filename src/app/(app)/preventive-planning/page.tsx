import { DbErrorHint } from "@/components/layout/DbError";
import { PreventivePlansModuleClient } from "@/components/preventive-planning/plans-module-client";
import { canManage } from "@/lib/auth/session";
import { getSession } from "@/lib/auth/session-server";
import { loadPreventivePlanningPageData } from "@/lib/preventive/plans-query";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PreventivePlanningPage() {
  try {
    const session = getSession();
    const canWrite = session ? canManage(session) : false;
    const data = await loadPreventivePlanningPageData();

    return (
      <PreventivePlansModuleClient
        persistenceReady={data.persistenceReady}
        canWrite={canWrite}
        plans={data.plans}
        machines={data.machines}
        technicians={data.technicians}
        maintenanceTypes={data.maintenanceTypes}
      />
    );
  } catch (e) {
    return (
      <div className="gmao-module-page density-page-inner py-8">
        <DbErrorHint detail={e instanceof Error ? e.message : String(e)} />
      </div>
    );
  }
}
