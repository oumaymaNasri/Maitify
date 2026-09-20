"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import * as React from "react";

import { GmaoStandardTable, GmaoTablePagination } from "@/components/gmao/gmao-table";
import { Badge } from "@/components/ui/badge";
import type { MachineHistoryRow } from "@/lib/gmao/machine-history-query";
import { hrefWithPage, pageSizeQueryValue } from "@/lib/db/pagination";
import { interventionTypeFr } from "@/lib/view/labels";
import { maintenanceWorkflowStatusFr } from "@/lib/view/machine-labels";
import { formatDateFrShort } from "@/lib/utils/format-date";
import { cn } from "@/lib/utils";

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

const columns: ColumnDef<MachineHistoryRow>[] = [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-sm text-slate-700">{formatDateFrShort(row.original.date)}</span>
    ),
  },
  {
    accessorKey: "referenceCode",
    header: "Code/Réf",
    cell: ({ row }) => <span className="font-mono text-xs text-slate-600">{row.original.referenceCode}</span>,
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <Badge variant={row.original.type === "CORRECTIVE" ? "warning" : "secondary"} className="rounded-full font-normal">
        {interventionTypeFr(row.original.type)}
      </Badge>
    ),
  },
  {
    accessorKey: "technicianName",
    header: "Technicien",
    cell: ({ row }) => <span className="text-sm text-slate-700">{row.original.technicianName ?? "—"}</span>,
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <span className="line-clamp-2 max-w-md text-sm text-slate-700" title={row.original.description}>
        {row.original.description}
      </span>
    ),
  },
  {
    accessorKey: "workflowStatus",
    header: "Statut",
    cell: ({ row }) => (
      <Badge className={cn("rounded-full font-medium", workflowBadgeClass(row.original.workflowStatus))}>
        {maintenanceWorkflowStatusFr(row.original.workflowStatus)}
      </Badge>
    ),
  },
];

export function MachineHistoryTable({
  machineId,
  items,
  total,
  page,
  pageCount,
  pageSize,
}: {
  machineId: string;
  items: MachineHistoryRow[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
}) {
  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  const search = React.useMemo(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    const size = pageSizeQueryValue(pageSize);
    if (size) params.set("pageSize", size);
    return params.toString();
  }, [page, pageSize]);

  const basePath = `/machines/${machineId}/historique`;

  return (
    <>
      <GmaoStandardTable
        table={table}
        emptyMessage="Aucune intervention enregistrée pour cet équipement."
        getRowId={(row) => row.id}
      />
      <GmaoTablePagination
        total={total}
        noun={total > 1 ? "interventions" : "intervention"}
        page={page}
        pageCount={pageCount}
        pageSize={pageSize}
        previousHref={hrefWithPage(basePath, search, Math.max(1, page - 1))}
        nextHref={hrefWithPage(basePath, search, page + 1)}
      />
    </>
  );
}
