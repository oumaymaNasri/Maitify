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

import type { InterventionListVm } from "@/components/interventions/intervention-types";
import { InterventionFicheButton } from "@/components/interventions/intervention-fiche-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateFrShort } from "@/lib/utils/format-date";
import { operationTypeFr } from "@/lib/view/gmao-labels";
import { maintenanceWorkflowStatusFr } from "@/lib/view/machine-labels";
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

type ServerPaginationProps = {
  page: number;
  pageCount: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
};

type InterventionsDataTableProps = {
  interventions: InterventionListVm[];
  selectedIds: Set<string>;
  onSelectedIdsChange: (ids: Set<string>) => void;
  onView: (row: InterventionListVm) => void;
  onEdit: (row: InterventionListVm) => void;
  onDelete: (row: InterventionListVm) => void;
  onBulkDelete: () => void;
  isPending?: boolean;
  readOnly?: boolean;
  serverPagination?: ServerPaginationProps;
};

function InterventionsDataTableInner({
  interventions,
  selectedIds,
  onSelectedIdsChange,
  onView,
  onEdit,
  onDelete,
  onBulkDelete,
  isPending,
  readOnly = false,
  serverPagination,
}: InterventionsDataTableProps) {
  const visibleIds = React.useMemo(() => interventions.map((r) => r.id), [interventions]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id));

  const toggleAllVisible = React.useCallback(
    (checked: boolean) => {
      const next = new Set(selectedIds);
      if (checked) visibleIds.forEach((id) => next.add(id));
      else visibleIds.forEach((id) => next.delete(id));
      onSelectedIdsChange(next);
    },
    [selectedIds, visibleIds, onSelectedIdsChange],
  );

  const toggleRow = React.useCallback(
    (id: string, checked: boolean) => {
      const next = new Set(selectedIds);
      if (checked) next.add(id);
      else next.delete(id);
      onSelectedIdsChange(next);
    },
    [selectedIds, onSelectedIdsChange],
  );

  const columns = React.useMemo<ColumnDef<InterventionListVm>[]>(
    () => {
      const cols: ColumnDef<InterventionListVm>[] = [];

      if (!readOnly) {
        cols.push({
          id: "select",
          header: () => (
            <RowCheckbox
              checked={allVisibleSelected}
              indeterminate={someVisibleSelected && !allVisibleSelected}
              onChange={toggleAllVisible}
              ariaLabel="Sélectionner toutes les interventions visibles"
            />
          ),
          cell: ({ row }) => (
            <RowCheckbox
              checked={selectedIds.has(row.original.id)}
              onChange={(checked) => toggleRow(row.original.id, checked)}
              ariaLabel={`Sélectionner ${row.original.machineName}`}
            />
          ),
          enableSorting: false,
        });
      }

      cols.push(
      {
        accessorKey: "machineName",
        header: "Machine",
        cell: ({ row }) => (
          <div className="min-w-[140px]">
            <p className="font-semibold text-slate-900">{row.original.machineName}</p>
            <p className="text-xs text-slate-500" suppressHydrationWarning>
              {formatDateFrShort(row.original.date)}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "operationType",
        header: "Opération",
        cell: ({ row }) => (
          <Badge variant="secondary" className="font-normal">
            {operationTypeFr(row.original.operationType)}
          </Badge>
        ),
      },
      {
        accessorKey: "workflowStatus",
        header: "Statut",
        cell: ({ row }) => (
          <Badge
            variant={row.original.workflowStatus === "OPEN" ? "warning" : "outline"}
            className="font-normal"
          >
            {maintenanceWorkflowStatusFr(row.original.workflowStatus)}
          </Badge>
        ),
      },
      {
        accessorKey: "durationMinutes",
        header: "Durée",
        cell: ({ row }) => (
          <span className="tabular-nums text-slate-600">
            {row.original.durationMinutes != null ? `${row.original.durationMinutes} min` : "—"}
          </span>
        ),
      },
      {
        accessorKey: "technicianName",
        header: "Technicien",
        cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.technicianName ?? "—"}</span>,
      },
      {
        accessorKey: "failureDescription",
        header: "Dysfonctionnement",
        cell: ({ row }) => (
          <p className="max-w-[180px] truncate text-sm text-slate-500" title={row.original.failureDescription ?? ""}>
            {row.original.failureDescription ?? "—"}
          </p>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl text-[#1F76FB] hover:bg-[#E8F1FF]"
              onClick={() => onView(row.original)}
              aria-label="Voir"
            >
              <Eye className="h-4 w-4" />
            </Button>
            {!readOnly ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-[#1F76FB]"
                  onClick={() => onEdit(row.original)}
                  aria-label="Modifier"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                  onClick={() => onDelete(row.original)}
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            ) : null}
            <InterventionFicheButton
              interventionId={row.original.id}
              machineName={row.original.machineName}
              size="icon"
              variant="ghost"
              useApi
            />
          </div>
        ),
      },
      );

      return cols;
    },
    [
      allVisibleSelected,
      readOnly,
      someVisibleSelected,
      selectedIds,
      toggleAllVisible,
      toggleRow,
      onView,
      onEdit,
      onDelete,
    ],
  );

  const table = useReactTable({
    data: interventions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...(serverPagination ? {} : { getPaginationRowModel: getPaginationRowModel(), initialState: { pagination: { pageSize: 10 } } }),
  });

  const selectedCount = selectedIds.size;

  if (interventions.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-600">
        Aucune intervention ne correspond aux filtres.
      </p>
    );
  }

  return (
    <div className={cn("space-y-4", isPending && "opacity-70 transition-opacity")}>
      {!readOnly && selectedCount > 0 ? (
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

      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="border-0 hover:bg-transparent">
                {hg.headers.map((h) => (
                  <TableHead
                    key={h.id}
                    className="h-11 bg-[#1F76FB] px-3 text-xs font-semibold uppercase tracking-wide text-white first:rounded-tl-xl last:rounded-tr-xl"
                  >
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
          <span className="font-semibold tabular-nums text-slate-900">
            {serverPagination ? serverPagination.total : table.getFilteredRowModel().rows.length}
          </span>{" "}
          intervention(s)
          {serverPagination ? (
            <span className="text-slate-500">
              {" "}
              · page {serverPagination.page}/{serverPagination.pageCount}
            </span>
          ) : null}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={serverPagination ? serverPagination.page <= 1 : !table.getCanPreviousPage()}
            onClick={() => (serverPagination ? serverPagination.onPrevious() : table.previousPage())}
            className="rounded-xl border-slate-100"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Précédent</span>
          </Button>
          <span className="text-sm tabular-nums text-slate-600">
            Page {serverPagination ? serverPagination.page : table.getState().pagination.pageIndex + 1} /{" "}
            {serverPagination ? serverPagination.pageCount : Math.max(table.getPageCount(), 1)}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={
              serverPagination
                ? serverPagination.page >= serverPagination.pageCount
                : !table.getCanNextPage()
            }
            onClick={() => (serverPagination ? serverPagination.onNext() : table.nextPage())}
            className="rounded-xl border-slate-100"
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Suivant</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export const InterventionsDataTable = React.memo(InterventionsDataTableInner);
