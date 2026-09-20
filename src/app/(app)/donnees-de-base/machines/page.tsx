import { Suspense } from "react";

import { DbErrorHint } from "@/components/layout/DbError";
import { MachineGridSkeleton } from "@/components/machines/machine-grid-skeleton";
import { MachinesModuleClient } from "@/components/machines/machines-module-client";
import { getMachinesInventoryCached, MACHINES_PAGE_SIZE } from "@/lib/gmao/machines-query";

type PageProps = {
  searchParams?: { page?: string; q?: string; status?: string; location?: string; sector?: string };
};

async function MachinesGrid({ searchParams }: PageProps) {
  try {
    const page = Math.max(1, Number.parseInt(searchParams?.page ?? "1", 10) || 1);
    const result = await getMachinesInventoryCached(page, MACHINES_PAGE_SIZE, {
      q: searchParams?.q?.trim() ?? "",
      status: searchParams?.status ?? "ALL",
      location: searchParams?.location ?? "ALL",
      sector: searchParams?.sector ?? "ALL",
    });
    return (
      <MachinesModuleClient
        machines={result.items}
        pagination={{ page: result.page, pageCount: result.pageCount, total: result.total }}
      />
    );
  } catch (e) {
    return <DbErrorHint detail={e instanceof Error ? e.message : String(e)} />;
  }
}

export default function MasterDataMachinesPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<MachineGridSkeleton />}>
      <MachinesGrid searchParams={searchParams} />
    </Suspense>
  );
}
