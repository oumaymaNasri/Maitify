import { PageHeaderSkeleton } from "@/components/layout/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div className="density-page-inner space-y-6">
      <PageHeaderSkeleton withAction />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
