"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { ServerPaginatedTable } from "@/components/data-table/server-paginated-table";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { Badge } from "@/components/ui/badge";
import type { SparePartRow } from "@/lib/gmao/parts-query";

const cols: ColumnDef<SparePartRow>[] = [
  {
    id: "thumb",
    header: "",
    cell: ({ row }) => (
      <div className="relative h-12 w-12 overflow-hidden rounded-md bg-muted">
        {row.original.imageUrl ? (
          <OptimizedImage src={row.original.imageUrl} alt="" fill sizes="48px" className="object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-[10px] text-muted-foreground">—</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "designation",
    header: "Désignation",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.designation}</p>
        {row.original.brand ? <p className="text-xs text-muted-foreground">{row.original.brand}</p> : null}
      </div>
    ),
  },
  {
    accessorKey: "reference",
    header: "Référence",
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.reference ?? "—"}</span>,
  },
  {
    accessorKey: "quantity",
    header: "Stock",
    cell: ({ row }) => {
      const critical = row.original.quantity <= row.original.minStock;
      return (
        <div className="flex items-center gap-2">
          <span className="tabular-nums font-medium">{row.original.quantity}</span>
          {critical ? (
            <Badge className="border border-rose-200 bg-rose-50 text-[10px] text-rose-700">
              Stock critique
            </Badge>
          ) : null}
          <span className="text-xs text-muted-foreground">/ seuil {row.original.minStock}</span>
        </div>
      );
    },
  },
  {
    id: "machine",
    header: "Machine",
    cell: ({ row }) =>
      row.original.machineName ? (
        <span className="text-sm">
          {row.original.machineName}
          {row.original.machineMatricule != null ? (
            <span className="font-mono text-muted-foreground"> · M{row.original.machineMatricule}</span>
          ) : null}
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">Magasin général</span>
      ),
  },
];

type PartsDataTableProps = {
  rows: SparePartRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  query: string;
};

export function PartsDataTable({ rows, total, page, pageSize, pageCount, query }: PartsDataTableProps) {
  return (
    <ServerPaginatedTable
      columns={cols}
      data={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      pageCount={pageCount}
      initialQuery={query}
      filterPlaceholder="Désignation, référence, marque…"
    />
  );
}
