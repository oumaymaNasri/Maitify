"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Edit2, Eye, Trash2 } from "lucide-react";
import * as React from "react";

import { MaintenanceOrderPdfButton } from "@/components/maintenance-orders/maintenance-order-pdf-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { MaintenanceOrderRow } from "@/lib/gmao/maintenance-orders-query";
import { formatDateFrShort } from "@/lib/utils/format-date";
import { maintenanceOrderStatusFr } from "@/lib/view/gmao-labels";
import { interventionTypeFr } from "@/lib/view/labels";
import { cn } from "@/lib/utils";

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
    />
  );
}

function statusBadgeClass(status: MaintenanceOrderRow["status"]): string {
  switch (status) {
    case "ACTIVE":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "CANCELLED":
      return "bg-slate-100 text-slate-600 border-slate-200";
    default:
      return "";
  }
}

type ServerPaginationProps = {
  page: number;
  pageCount: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
};

type MaintenanceOrdersDataTableProps = {
  orders: MaintenanceOrderRow[];
  selectedIds: Set<string>;
  onSelectedIdsChange: (ids: Set<string>) => void;
  onView: (order: MaintenanceOrderRow) => void;
  onEdit: (order: MaintenanceOrderRow) => void;
  onDelete: (order: MaintenanceOrderRow) => void;
  onBulkDelete: () => void;
  isPending?: boolean;
  readOnly?: boolean;
  serverPagination?: ServerPaginationProps;
};

export function MaintenanceOrdersDataTable({
  orders,
  selectedIds,
  onSelectedIdsChange,
  onView,
  onEdit,
  onDelete,
  onBulkDelete,
  isPending,
  readOnly = false,
  serverPagination,
}: MaintenanceOrdersDataTableProps) {
  const visibleIds = React.useMemo(() => orders.map((o) => o.id), [orders]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id));

  const toggleAllVisible = React.useCallback(
    (checked: boolean) => {
      onSelectedIdsChange(
        checked ? new Set(visibleIds) : new Set(Array.from(selectedIds).filter((id) => !visibleIds.includes(id))),
      );
    },
    [onSelectedIdsChange, selectedIds, visibleIds],
  );

  const columns = React.useMemo<ColumnDef<MaintenanceOrderRow>[]>(
    () => {
      const cols: ColumnDef<MaintenanceOrderRow>[] = [];

      if (!readOnly) {
        cols.push({
          id: "select",
          header: () => (
            <RowCheckbox
              checked={allVisibleSelected}
              indeterminate={someVisibleSelected && !allVisibleSelected}
              onChange={toggleAllVisible}
              ariaLabel="Sélectionner tous les ordres visibles"
            />
          ),
          cell: ({ row }) => (
            <RowCheckbox
              checked={selectedIds.has(row.original.id)}
              onChange={(checked) => {
                const next = new Set(selectedIds);
                if (checked) next.add(row.original.id);
                else next.delete(row.original.id);
                onSelectedIdsChange(next);
              }}
              ariaLabel={`Sélectionner ${row.original.reference}`}
            />
          ),
          size: 40,
        });
      }

      cols.push(
      {
        accessorKey: "reference",
        header: "Référence",
        cell: ({ row }) => <span className="font-medium text-slate-900">{row.original.reference}</span>,
      },
      {
        accessorKey: "plannedDate",
        header: "Date prévue",
        cell: ({ row }) => formatDateFrShort(row.original.plannedDate),
      },
      {
        accessorKey: "interventionType",
        header: "Type",
        cell: ({ row }) => interventionTypeFr(row.original.interventionType),
      },
      {
        accessorKey: "machineNames",
        header: "Machines",
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-[220px] text-sm text-slate-600" title={row.original.machineNames}>
            {row.original.machineNames || "—"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Statut",
        cell: ({ row }) => (
          <Badge variant="outline" className={cn("font-medium", statusBadgeClass(row.original.status))}>
            {maintenanceOrderStatusFr(row.original.status)}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <MaintenanceOrderPdfButton orderId={row.original.id} reference={row.original.reference} size="icon" />
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onView(row.original)} aria-label="Voir">
              <Eye className="h-4 w-4" />
            </Button>
            {!readOnly ? (
              <>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(row.original)} aria-label="Modifier">
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-rose-600 hover:text-rose-700"
                  onClick={() => onDelete(row.original)}
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            ) : null}
          </div>
        ),
      },
      );

      return cols;
    },
    [allVisibleSelected, onDelete, onEdit, onSelectedIdsChange, onView, readOnly, selectedIds, someVisibleSelected, toggleAllVisible],
  );

  const table = useReactTable({
    data: orders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...(serverPagination ? {} : { getPaginationRowModel: getPaginationRowModel(), initialState: { pagination: { pageSize: 10 } } }),
  });

  return (
    <div className={cn("space-y-3", isPending && "opacity-70")}>
      {!readOnly && selectedIds.size > 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm">
          <span className="text-slate-600">{selectedIds.size} sélectionné(s)</span>
          <Button type="button" variant="destructive" size="sm" onClick={onBulkDelete}>
            Supprimer la sélection
          </Button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="bg-slate-50/80 hover:bg-slate-50/80">
                {hg.headers.map((h) => (
                  <TableHead key={h.id} className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-sm text-slate-500">
                  Aucun ordre de maintenance.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          {serverPagination ? (
            <>
              {serverPagination.total} résultat(s) · page {serverPagination.page}/{serverPagination.pageCount}
            </>
          ) : (
            <>Page {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}</>
          )}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={serverPagination ? serverPagination.page <= 1 : !table.getCanPreviousPage()}
            onClick={() => (serverPagination ? serverPagination.onPrevious() : table.previousPage())}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={serverPagination ? serverPagination.page >= serverPagination.pageCount : !table.getCanNextPage()}
            onClick={() => (serverPagination ? serverPagination.onNext() : table.nextPage())}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
