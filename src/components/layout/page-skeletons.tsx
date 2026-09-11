import { MachineGridSkeleton } from "@/components/machines/machine-grid-skeleton";
import { TablePageSkeleton } from "@/components/data-table/table-page-skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PageHeaderSkeleton({ withAction = false }: { withAction?: boolean }) {
  return (
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48 md:h-8 md:w-64" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      {withAction ? <Skeleton className="h-9 w-36 shrink-0" /> : null}
    </div>
  );
}

export function DashboardPageSkeleton() {
  return (
    <div className="density-page-inner space-y-6">
      <PageHeaderSkeleton withAction />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-border/80">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent className="pb-4">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="mt-2 h-3 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[280px] w-full rounded-xl" />
        <Skeleton className="h-[280px] w-full rounded-xl" />
      </div>
    </div>
  );
}

export function MachinesPageSkeleton() {
  return (
    <div className="density-page-inner space-y-6">
      <PageHeaderSkeleton />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-full sm:w-56" />
      </div>
      <MachineGridSkeleton />
    </div>
  );
}

export function InterventionsPageSkeleton() {
  return (
    <div className="density-page-inner space-y-6">
      <PageHeaderSkeleton />
      <TablePageSkeleton columns={6} />
    </div>
  );
}

export function PartsPageSkeleton() {
  return (
    <div className="density-page-inner space-y-6">
      <PageHeaderSkeleton />
      <TablePageSkeleton columns={5} />
    </div>
  );
}

export function WaterQualityPageSkeleton() {
  return (
    <div className="density-page-inner space-y-8">
      <PageHeaderSkeleton />
      <div className="mx-auto max-w-3xl space-y-4 rounded-xl border border-border bg-card p-5">
        <Skeleton className="h-5 w-40" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div>
        <Skeleton className="mb-4 h-6 w-48" />
        <TablePageSkeleton columns={8} rows={10} />
      </div>
    </div>
  );
}

export function TechniciansPageSkeleton() {
  return (
    <div className="density-page-inner space-y-6">
      <PageHeaderSkeleton />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-3 p-4">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function FormPageSkeleton() {
  return (
    <div className="density-page-inner mx-auto max-w-3xl space-y-6">
      <PageHeaderSkeleton />
      <Card>
        <CardContent className="space-y-4 p-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-40" />
        </CardContent>
      </Card>
    </div>
  );
}
