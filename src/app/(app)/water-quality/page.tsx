import { WaterMeasurementForm } from "@/components/water/WaterMeasurementForm";
import { WaterMeasurementsDataTable } from "@/components/water/water-measurements-data-table";
import { TablePageSkeleton } from "@/components/data-table/table-page-skeleton";
import { DbErrorHint } from "@/components/layout/DbError";
import { parsePaginationParams } from "@/lib/db/pagination";
import { getWaterMeasurementsPageCached } from "@/lib/gmao/water-measurements-query";
import { paginationSearchKey } from "@/lib/utils/search-params-key";
import { Suspense } from "react";

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
    <div className="gmao-module-page density-page-inner space-y-4">
      <div className="mx-auto max-w-3xl">
        <WaterMeasurementForm />
      </div>
      <Suspense key={paginationSearchKey(searchParams)} fallback={<TablePageSkeleton columns={8} />}>
        <MeasurementsTable searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
