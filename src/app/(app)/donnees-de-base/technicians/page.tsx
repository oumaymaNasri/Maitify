import { DbErrorHint } from "@/components/layout/DbError";
import { TechniciansModuleClient } from "@/components/technicians/technicians-module-client";
import { getTechniciansCached } from "@/lib/gmao/technicians-query";

export default async function MasterDataTechniciansPage() {
  try {
    const technicians = await getTechniciansCached();
    return <TechniciansModuleClient technicians={technicians} />;
  } catch (e) {
    return <DbErrorHint detail={e instanceof Error ? e.message : String(e)} />;
  }
}
