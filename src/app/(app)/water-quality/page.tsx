import { Suspense } from "react";

import { DbErrorHint } from "@/components/layout/DbError";
import { WaterMeasurementForm } from "@/components/water/WaterMeasurementForm";
import { WaterMeasurementsDataTable } from "@/components/water/water-measurements-data-table";
import { TablePageSkeleton } from "@/components/data-table/table-page-skeleton";
import { parsePaginationParams } from "@/lib/db/pagination";
import { getWaterMeasurementsPageCached } from "@/lib/gmao/water-measurements-query";
import { paginationSearchKey } from "@/lib/utils/search-params-key";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

async function MeasurementsTable({ searchParams }: PageProps) {
  const params = parsePaginationParams(searchParams);

  try {
    const result = await getWaterMeasurementsPageCached(params);
    return (
      <WaterMeasurementsDataTable
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

export default function WaterQualityPage({ searchParams }: PageProps) {
  return (
    <div className="density-page-inner space-y-8">
      <p className="max-w-3xl text-sm text-muted-foreground">Saisie validée (Zod) et historique paginé côté serveur.</p>

      <div className="mx-auto max-w-3xl">
        <WaterMeasurementForm />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Historique des mesures</h2>
        <Suspense key={paginationSearchKey(searchParams)} fallback={<TablePageSkeleton columns={8} />}>
          <MeasurementsTable searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
