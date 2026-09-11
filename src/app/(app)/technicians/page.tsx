import { DbErrorHint } from "@/components/layout/DbError";
import { TechniciansModuleClient } from "@/components/technicians/technicians-module-client";
import { getTechniciansCached } from "@/lib/gmao/technicians-query";

export default async function TechniciansPage() {
  try {
    const technicians = await getTechniciansCached();
    return <TechniciansModuleClient technicians={technicians} />;
  } catch (e) {
    return (
      <div className="gmao-module-page density-page-inner py-8">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Liste des Techniciens</h1>
        <DbErrorHint detail={e instanceof Error ? e.message : String(e)} />
      </div>
    );
  }
}
