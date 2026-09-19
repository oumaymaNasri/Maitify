import { Suspense } from "react";

import { DbErrorHint } from "@/components/layout/DbError";
import { MachineGridSkeleton } from "@/components/machines/machine-grid-skeleton";
import { MachinesModuleClient } from "@/components/machines/machines-module-client";
import { getMachinesInventoryCached, MACHINES_PAGE_SIZE } from "@/lib/gmao/machines-query";

type PageProps = {
  searchParams?: { page?: string };
};

async function MachinesGrid({ page }: { page: number }) {
  try {
    const paginated = await getMachinesInventoryCached(page, MACHINES_PAGE_SIZE);
    return (
      <MachinesModuleClient
        machines={paginated.items}
        pagination={{
          page: paginated.page,
          pageCount: paginated.pageCount,
          total: paginated.total,
          pageSize: paginated.pageSize,
        }}
      />
    );
  } catch (e) {
    return <DbErrorHint detail={e instanceof Error ? e.message : String(e)} />;
  }
}

export default function MasterDataMachinesPage({ searchParams }: PageProps) {
  const page = Math.max(1, Number.parseInt(searchParams?.page ?? "1", 10) || 1);
  return (
    <Suspense fallback={<MachineGridSkeleton />}>
      <MachinesGrid page={page} />
    </Suspense>
  );
}
