import { Skeleton } from "@/components/ui/skeleton";
import { GmaoModuleShell } from "@/components/gmao/premium/module-shell";

export function MachineGridSkeleton() {
  return (
    <GmaoModuleShell>
      <Skeleton className="h-32 w-full rounded-lg" />
      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <Skeleton className="aspect-[16/10] w-full rounded-none" />
            <div className="space-y-3 p-4">
              <Skeleton className="h-5 w-[85%]" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        ))}
      </div>
    </GmaoModuleShell>
  );
}
