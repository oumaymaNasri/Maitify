"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from "@tanstack/react-table";
import { ArrowDownUp, ChevronLeft, ChevronRight, Edit2, Package, Trash2 } from "lucide-react";
import * as React from "react";

import { GMAO_TABLE_HEAD, GMAO_TABLE_WRAP } from "@/components/gmao/table-styles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
};

function RowCheckbox({
  checked,
  indeterminate,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
}) {
  const ref = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate);
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      aria-label={ariaLabel}
      className="h-4 w-4 rounded border-slate-300 text-[#1F76FB] focus:ring-[#1F76FB]"
      onClick={(e) => e.stopPropagation()}
    />
  );
}

function StockInventoryGridInner({
  parts,
  selectedIds,
  onSelectedIdsChange,
  onEdit,
  onDelete,
  onAdjust,
  onBulkDelete,
}: StockInventoryGridProps) {
  const visibleIds = React.useMemo(() => parts.map((p) => p.id), [parts]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id));
  const selectedCount = selectedIds.size;

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
        header: () => (
          <RowCheckbox
            checked={allVisibleSelected}
            indeterminate={someVisibleSelected && !allVisibleSelected}
            onChange={toggleAllVisible}
            ariaLabel="Sélectionner toutes les pièces visibles"
          />
        ),
        cell: ({ row }) => (
          <RowCheckbox
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
          <span
            className={cn(
              "tabular-nums font-semibold",
              row.original.isLowStock ? "text-rose-600" : "text-slate-900",
            )}
          >
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
        header: "Alerte",
        cell: ({ row }) =>
          row.original.isLowStock ? (
            <Badge className="border-0 bg-rose-100 font-medium text-rose-800 hover:bg-rose-100">Rupture / Alerte</Badge>
          ) : (
            <Badge className="border-0 bg-emerald-100 font-medium text-emerald-800 hover:bg-emerald-100">OK</Badge>
          ),
      },
      {
        id: "machines",
        header: "Machines",
        cell: ({ row }) =>
          row.original.machines.length > 0 ? (
            <div className="flex max-w-xs flex-wrap gap-1">
              {row.original.machines.map((m) => (
                <Badge key={m.id} variant="secondary" className="text-[10px] font-normal">
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
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl text-[#1F76FB] hover:bg-[#E8F1FF]"
              title="Ajuster le stock"
              onClick={() => onAdjust(row.original)}
              aria-label={`Ajuster ${row.original.designation}`}
            >
              <ArrowDownUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-[#1F76FB]"
              onClick={() => onEdit(row.original)}
              aria-label={`Modifier ${row.original.designation}`}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600"
              onClick={() => onDelete(row.original)}
              aria-label={`Supprimer ${row.original.designation}`}
            >
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
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 12 } },
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
      {selectedCount > 0 ? (
        <div className="flex flex-col gap-3 rounded-xl border border-[#1F76FB]/25 bg-[#E8F1FF] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-slate-800">
            <span className="tabular-nums text-[#1F76FB]">{selectedCount}</span> élément
            {selectedCount > 1 ? "s" : ""} sélectionné{selectedCount > 1 ? "s" : ""}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onBulkDelete}
            className="rounded-xl border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Supprimer la sélection
          </Button>
        </div>
      ) : null}

      <div className={GMAO_TABLE_WRAP}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="border-0 hover:bg-transparent">
                {hg.headers.map((h) => (
                  <TableHead key={h.id} className={GMAO_TABLE_HEAD}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row, i) => (
              <TableRow
                key={row.id}
                data-state={selectedIds.has(row.original.id) ? "selected" : undefined}
                className={cn(
                  "border-slate-100 transition-colors hover:bg-[#E8F1FF]/50",
                  i % 2 === 1 && "bg-slate-50/60",
                  selectedIds.has(row.original.id) && "bg-[#E8F1FF]/30",
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="px-3 py-3 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-sm text-slate-600">
          <span className="font-semibold tabular-nums text-slate-900">{parts.length}</span> pièce(s)
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            className="rounded-xl border-slate-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm tabular-nums text-slate-600">
            Page {table.getState().pagination.pageIndex + 1} / {Math.max(table.getPageCount(), 1)}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            className="rounded-xl border-slate-100"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export const StockInventoryGrid = React.memo(StockInventoryGridInner);
