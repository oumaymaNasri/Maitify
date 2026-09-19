import { Skeleton } from "@/components/ui/skeleton";

export function DashboardPremiumSkeleton() {
  return (
    <div className="-mx-3 -mt-3 md:-mx-5 md:-mt-5 lg:-mx-6 lg:-mt-6">
      <div className="flex justify-end gap-6 bg-white px-8 py-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-16 bg-slate-100" />
        ))}
      </div>
      <div className="grid gap-4 px-4 py-6 md:grid-cols-2 md:px-8 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-[108px] w-full bg-white" />
        ))}
      </div>
    </div>
  );
}
