import { Skeleton } from "@/components/ui/skeleton";
import { DashboardCard } from "@/components/dashboard/premium/dashboard-card";

export function DashboardPremiumSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-80 max-w-full bg-slate-200" />
          <Skeleton className="h-4 w-96 max-w-full bg-slate-100" />
        </div>
        <Skeleton className="h-11 w-48 rounded-lg bg-slate-200" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-12 lg:grid-rows-2">
        <DashboardCard className="lg:col-span-3 lg:row-start-1">
          <Skeleton className="h-4 w-28 bg-slate-200" />
          <Skeleton className="mx-auto mt-4 h-20 w-32 rounded-full bg-slate-100" />
        </DashboardCard>
        <DashboardCard className="lg:col-span-3 lg:row-start-2">
          <Skeleton className="h-4 w-24 bg-slate-200" />
          <Skeleton className="mt-4 h-10 w-16 bg-slate-100" />
        </DashboardCard>
        <DashboardCard className="lg:col-span-3 lg:row-span-2 lg:row-start-1">
          <Skeleton className="h-4 w-32 bg-slate-200" />
          <Skeleton className="mt-4 h-12 w-14 bg-slate-100" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg bg-slate-50" />
            ))}
          </div>
        </DashboardCard>
        <div className="lg:col-span-6 lg:row-span-2 lg:row-start-1">
          <DashboardCard className="overflow-hidden p-0">
            <div className="flex flex-col lg:flex-row lg:min-h-[280px]">
              <div className="flex-1 space-y-3 p-5">
                <Skeleton className="h-4 w-24 bg-slate-200" />
                <Skeleton className="h-7 w-48 bg-slate-100" />
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full bg-slate-50" />
                ))}
              </div>
              <Skeleton className="min-h-[180px] flex-1 rounded-none bg-slate-100 lg:min-h-0" />
            </div>
          </DashboardCard>
        </div>
      </div>

      <div className="grid gap-4 md:gap-5 lg:grid-cols-12">
        <DashboardCard className="lg:col-span-8">
          <Skeleton className="h-5 w-40 bg-slate-200" />
          <Skeleton className="mt-4 h-[280px] w-full rounded-xl bg-slate-100" />
        </DashboardCard>
        <DashboardCard className="lg:col-span-4">
          <Skeleton className="h-5 w-36 bg-slate-200" />
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl bg-slate-100" />
            ))}
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}
