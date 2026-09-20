import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { MachineHistoryExportButtons } from "@/components/machines/machine-history-export-buttons";
import { GmaoTablePagination, gmaoRowClass } from "@/components/gmao/gmao-table";
import { GMAO_TABLE_CELL, GMAO_TABLE_HEAD, GMAO_TABLE_WRAP } from "@/components/gmao/table-styles";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  fetchMachineHistoryExportRows,
  fetchMachineHistoryHeader,
  fetchMachineHistoryPage,
} from "@/lib/gmao/machine-history-query";
import { interventionTypeFr } from "@/lib/view/labels";
import {
  machineAssetStatusFr,
  machineStatusBadgeClass,
  maintenanceWorkflowStatusFr,
} from "@/lib/view/machine-labels";
import { formatDateFrShort } from "@/lib/utils/format-date";
import { cn } from "@/lib/utils";

type PageProps = {
  params: { id: string };
  searchParams?: { page?: string };
};

function workflowBadgeClass(status: string): string {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "OPEN":
      return "bg-amber-100 text-amber-800 border-amber-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export default async function MachineHistoryPage({ params, searchParams }: PageProps) {
  const page = Math.max(1, Number.parseInt(searchParams?.page ?? "1", 10) || 1);
  const [header, history, exportRows] = await Promise.all([
    fetchMachineHistoryHeader(params.id),
    fetchMachineHistoryPage(params.id, page),
    fetchMachineHistoryExportRows(params.id),
  ]);

  if (!header || !history || exportRows === null) notFound();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <ButtonLink
            href="/donnees-de-base/machines"
            variant="outline"
            size="sm"
            className="h-9 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Retour à la liste
          </ButtonLink>
          <span className="font-semibold text-slate-900">{header.name}</span>
          <span className="font-mono text-xs text-slate-600">{header.code}</span>
          <span className="text-sm text-slate-600">{header.location}</span>
          <Badge className={cn("font-medium", machineStatusBadgeClass(header.assetStatus))}>
            {machineAssetStatusFr(header.assetStatus)}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MachineHistoryExportButtons header={header} rows={exportRows} />
        </div>
      </div>

      {history.items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-600">
          Aucune intervention enregistrée pour cet équipement.
        </p>
      ) : (
        <>
          <div className={GMAO_TABLE_WRAP}>
            <Table>
              <TableHeader>
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead className={GMAO_TABLE_HEAD}>Date</TableHead>
                  <TableHead className={GMAO_TABLE_HEAD}>Code/Réf</TableHead>
                  <TableHead className={GMAO_TABLE_HEAD}>Type</TableHead>
                  <TableHead className={GMAO_TABLE_HEAD}>Technicien</TableHead>
                  <TableHead className={GMAO_TABLE_HEAD}>Description</TableHead>
                  <TableHead className={GMAO_TABLE_HEAD}>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.items.map((row, index) => (
                  <TableRow key={row.id} className={gmaoRowClass(index)}>
                    <TableCell className={`whitespace-nowrap ${GMAO_TABLE_CELL} text-sm text-slate-700`}>
                      {formatDateFrShort(row.date)}
                    </TableCell>
                    <TableCell className={`${GMAO_TABLE_CELL} font-mono text-xs text-slate-600`}>
                      {row.referenceCode}
                    </TableCell>
                    <TableCell className={`${GMAO_TABLE_CELL} text-sm text-slate-700`}>
                      <Badge variant={row.type === "CORRECTIVE" ? "warning" : "secondary"} className="rounded-full font-normal">
                        {interventionTypeFr(row.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className={`${GMAO_TABLE_CELL} text-sm text-slate-700`}>
                      {row.technicianName ?? "—"}
                    </TableCell>
                    <TableCell className={`max-w-md ${GMAO_TABLE_CELL} text-sm text-slate-700`}>
                      <span className="line-clamp-2" title={row.description}>
                        {row.description}
                      </span>
                    </TableCell>
                    <TableCell className={GMAO_TABLE_CELL}>
                      <Badge className={cn("rounded-full font-medium", workflowBadgeClass(row.workflowStatus))}>
                        {maintenanceWorkflowStatusFr(row.workflowStatus)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <GmaoTablePagination
            total={history.total}
            noun={history.total > 1 ? "interventions" : "intervention"}
            page={history.page}
            pageCount={history.pageCount}
            previousHref={
              history.page > 1
                ? `/machines/${params.id}/historique${history.page - 1 > 1 ? `?page=${history.page - 1}` : ""}`
                : undefined
            }
            nextHref={
              history.page < history.pageCount ? `/machines/${params.id}/historique?page=${history.page + 1}` : undefined
            }
          />
        </>
      )}
    </div>
  );
}
