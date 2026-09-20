"use client";

import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import * as React from "react";

import { GmaoStandardTable, GmaoTablePagination } from "@/components/gmao/gmao-table";
import { Badge } from "@/components/ui/badge";
import type { StockMovementRow } from "@/lib/gmao/stock-movements-query";
import { cn } from "@/lib/utils";

type StockMovementsTableProps = {
  movements: StockMovementRow[];
  isPending?: boolean;
};

export function StockMovementsTable({ movements, isPending }: StockMovementsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "date", desc: true }]);

  const columns = React.useMemo<ColumnDef<StockMovementRow>[]>(
    () => [
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm tabular-nums text-slate-600">
            {new Date(row.original.date).toLocaleString("fr-FR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        ),
      },
      {
        accessorKey: "partDesignation",
        header: "Pièce",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-slate-900">{row.original.partDesignation}</p>
            <p className="text-xs text-slate-500">
              {[row.original.partBrand, row.original.partReference].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => {
          const isEntree = row.original.type === "ENTREE";
          return (
            <Badge
              className={cn(
                "gap-1 rounded-full border-0",
                isEntree ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "bg-amber-100 text-amber-800 hover:bg-amber-100",
              )}
            >
              {isEntree ? <ArrowDownLeft className="h-3 w-3" aria-hidden /> : <ArrowUpRight className="h-3 w-3" aria-hidden />}
              {isEntree ? "Entrée" : "Sortie"}
            </Badge>
          );
        },
      },
      {
        accessorKey: "quantity",
        header: "Quantité",
        cell: ({ row }) => (
          <span className="font-mono font-semibold tabular-nums">
            {row.original.type === "ENTREE" ? "+" : "−"}
            {row.original.quantity}
          </span>
        ),
      },
      {
        accessorKey: "motif",
        header: "Motif",
        cell: ({ row }) => <span className="max-w-xs truncate text-sm text-slate-600">{row.original.motif ?? "—"}</span>,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: movements,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (movements.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
        <p className="font-medium text-slate-700">Aucun mouvement enregistré</p>
        <p className="mt-1 text-sm text-slate-500">
          Les entrées et sorties manuelles ou liées aux interventions apparaîtront ici.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <GmaoStandardTable table={table} emptyMessage="Aucun mouvement enregistré." isPending={isPending} getRowId={(row) => row.id} />
      <GmaoTablePagination total={movements.length} noun="mouvement(s)" />
    </div>
  );
}
