import { GmaoModuleShell } from "@/components/gmao/premium/module-shell";
import { TablePageSkeleton } from "@/components/data-table/table-page-skeleton";

export default function StockLoading() {
  return (
    <GmaoModuleShell>
      <TablePageSkeleton columns={5} />
    </GmaoModuleShell>
  );
}
