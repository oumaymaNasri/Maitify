import { Suspense } from "react";

import { DbErrorHint } from "@/components/layout/DbError";
import { PartsDataTable } from "@/components/parts/parts-data-table";
import { TablePageSkeleton } from "@/components/data-table/table-page-skeleton";
import { parsePaginationParams } from "@/lib/db/pagination";
import { getPartsPageCached } from "@/lib/gmao/parts-query";
import { paginationSearchKey } from "@/lib/utils/search-params-key";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

async function PartsFetch({ searchParams }: PageProps) {
  const params = parsePaginationParams(searchParams);

  try {
    const result = await getPartsPageCached(params);
    return (
      <PartsDataTable
        rows={result.items}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        pageCount={result.pageCount}
        query={params.q}
      />
    );
  } catch (e) {
    return <DbErrorHint detail={e instanceof Error ? e.message : String(e)} />;
  }
}

export default function PartsPage({ searchParams }: PageProps) {
  return (
    <div className="density-page-inner space-y-5">
      <p className="text-sm text-muted-foreground">
        Pagination serveur — la consommation sur intervention diminue le stock après validation (signature requise).
      </p>
      <Suspense key={paginationSearchKey(searchParams)} fallback={<TablePageSkeleton columns={5} />}>
        <PartsFetch searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
