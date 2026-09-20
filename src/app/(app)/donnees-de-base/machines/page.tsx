import { Suspense } from "react";

import { DbErrorHint } from "@/components/layout/DbError";
import { MachineGridSkeleton } from "@/components/machines/machine-grid-skeleton";
import { MachinesModuleClient } from "@/components/machines/machines-module-client";
import { getAllMachinesInventoryCached } from "@/lib/gmao/machines-query";

async function MachinesGrid() {
  try {
    const machines = await getAllMachinesInventoryCached();
    return <MachinesModuleClient machines={machines} />;
  } catch (e) {
    return <DbErrorHint detail={e instanceof Error ? e.message : String(e)} />;
  }
}

export default function MasterDataMachinesPage() {
  return (
    <Suspense fallback={<MachineGridSkeleton />}>
      <MachinesGrid />
    </Suspense>
  );
}
