import { GmaoModuleShell } from "@/components/gmao/premium/module-shell";
import { TablePageSkeleton } from "@/components/data-table/table-page-skeleton";

export default function StockLoading() {
  return (
    <GmaoModuleShell
      title="Stock & pièces de rechange"
      subtitle="Catalogue avec alertes stock critique — déduction automatique à la validation des interventions."
    >
      <TablePageSkeleton columns={5} />
    </GmaoModuleShell>
  );
}
