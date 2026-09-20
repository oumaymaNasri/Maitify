"use client";

import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { ArrowDownUp, Edit2, Package, Trash2 } from "lucide-react";
import * as React from "react";

import {
  GmaoBulkSelectBar,
  GmaoRowCheckbox,
  GmaoStandardTable,
  GmaoTablePagination,
} from "@/components/gmao/gmao-table";
import { GMAO_ICON_DELETE, GMAO_ICON_EDIT, GMAO_ICON_VIEW } from "@/components/gmao/table-styles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PartInventoryRow } from "@/lib/gmao/stock-parts-query";
import { cn } from "@/lib/utils";

type StockInventoryGridProps = {
  parts: PartInventoryRow[];
  selectedIds: Set<string>;
  onSelectedIdsChange: (ids: Set<string>) => void;
  onEdit: (part: PartInventoryRow) => void;
  onDelete: (part: PartInventoryRow) => void;
  onAdjust: (part: PartInventoryRow) => void;
  onBulkDelete: () => void;
  pagination?: { page: number; pageCount: number; total: number; pageSize?: number };
};

function StockInventoryGridInner({
  parts,
  selectedIds,
  onSelectedIdsChange,
  onEdit,
  onDelete,
  onAdjust,
  onBulkDelete,
  pagination,
}: StockInventoryGridProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const visibleIds = React.useMemo(() => parts.map((p) => p.id), [parts]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id));

  const toggleAllVisible = React.useCallback(
    (checked: boolean) => {
      const next = new Set(selectedIds);
      if (checked) visibleIds.forEach((id) => next.add(id));
      else visibleIds.forEach((id) => next.delete(id));
      onSelectedIdsChange(next);
    },
    [onSelectedIdsChange, selectedIds, visibleIds],
  );

  const toggleRow = React.useCallback(
    (id: string, checked: boolean) => {
      const next = new Set(selectedIds);
      if (checked) next.add(id);
      else next.delete(id);
      onSelectedIdsChange(next);
    },
    [onSelectedIdsChange, selectedIds],
  );

  const columns = React.useMemo<ColumnDef<PartInventoryRow>[]>(
    () => [
      {
        id: "select",
        enableSorting: false,
        header: () => (
          <GmaoRowCheckbox
            checked={allVisibleSelected}
            indeterminate={someVisibleSelected && !allVisibleSelected}
            onChange={toggleAllVisible}
            ariaLabel="Sélectionner toutes les pièces visibles"
          />
        ),
        cell: ({ row }) => (
          <GmaoRowCheckbox
            checked={selectedIds.has(row.original.id)}
            onChange={(checked) => toggleRow(row.original.id, checked)}
            ariaLabel={`Sélectionner ${row.original.designation}`}
          />
        ),
      },
      {
        accessorKey: "designation",
        header: "Pièce",
        cell: ({ row }) => (
          <div className="min-w-[140px]">
            <p className="font-semibold text-slate-900">{row.original.designation}</p>
            <p className="text-xs text-slate-500">
              {[row.original.brand, row.original.reference].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "quantity",
        header: "Stock",
        cell: ({ row }) => (
          <span className={cn("tabular-nums font-semibold", row.original.isLowStock ? "text-rose-600" : "text-slate-900")}>
            {row.original.quantity}
          </span>
        ),
      },
      {
        accessorKey: "minStock",
        header: "Seuil",
        cell: ({ row }) => <span className="tabular-nums text-slate-700">{row.original.minStock}</span>,
      },
      {
        id: "alert",
        accessorKey: "isLowStock",
        header: "Alerte",
        cell: ({ row }) =>
          row.original.isLowStock ? (
            <Badge className="rounded-full border-0 bg-rose-100 font-medium text-rose-800 hover:bg-rose-100">Rupture / Alerte</Badge>
          ) : (
            <Badge className="rounded-full border-0 bg-emerald-100 font-medium text-emerald-800 hover:bg-emerald-100">OK</Badge>
          ),
      },
      {
        id: "machines",
        header: "Machines",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.machines.length > 0 ? (
            <div className="flex max-w-xs flex-wrap gap-1">
              {row.original.machines.map((m) => (
                <Badge key={m.id} variant="secondary" className="rounded-full text-[10px] font-normal">
                  {m.name}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-sm text-slate-500">Magasin général</span>
          ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={GMAO_ICON_VIEW}
              title="Ajuster le stock"
              onClick={() => onAdjust(row.original)}
              aria-label={`Ajuster ${row.original.designation}`}
            >
              <ArrowDownUp className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className={GMAO_ICON_EDIT} onClick={() => onEdit(row.original)} aria-label={`Modifier ${row.original.designation}`}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className={GMAO_ICON_DELETE} onClick={() => onDelete(row.original)} aria-label={`Supprimer ${row.original.designation}`}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [allVisibleSelected, onAdjust, onDelete, onEdit, selectedIds, someVisibleSelected, toggleAllVisible, toggleRow],
  );

  const table = useReactTable({
    data: parts,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (parts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
        <Package className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <p className="font-medium text-slate-700">Aucune pièce trouvée</p>
        <p className="mt-1 text-sm text-slate-500">Modifiez vos filtres ou ajoutez une nouvelle pièce.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <GmaoBulkSelectBar count={selectedIds.size} onBulkDelete={onBulkDelete} />
      <GmaoStandardTable table={table} emptyMessage="Aucune pièce trouvée." selectedIdSet={selectedIds} getRowId={(row) => row.id} />
      <GmaoTablePagination
        total={pagination?.total ?? parts.length}
        noun="pièce(s)"
        page={pagination?.page}
        pageCount={pagination?.pageCount}
        pageSize={pagination?.pageSize}
        previousHref={
          pagination && pagination.page > 1
            ? pagination.page - 1 > 1
              ? `/stock?page=${pagination.page - 1}`
              : "/stock"
            : undefined
        }
        nextHref={
          pagination && pagination.page < pagination.pageCount ? `/stock?page=${pagination.page + 1}` : undefined
        }
      />
    </div>
  );
}

export const StockInventoryGrid = React.memo(StockInventoryGridInner);
