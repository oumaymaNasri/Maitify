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

import type { TechnicianRow } from "@/lib/gmao/technicians-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  technicianAvailabilityFr,
  technicianRoleFr,
  technicianSpecialtyFr,
} from "@/lib/view/gmao-labels";
import { technicianAvailabilityBadgeClass } from "@/lib/view/status-badges";
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

type TechniciansDataTableProps = {
  technicians: TechnicianRow[];
  selectedIds: Set<string>;
  onSelectedIdsChange: (ids: Set<string>) => void;
  onView: (technician: TechnicianRow) => void;
  onEdit: (technician: TechnicianRow) => void;
  onDelete: (technician: TechnicianRow) => void;
  onBulkDelete: () => void;
  isPending?: boolean;
};

export function TechniciansDataTable({
  technicians,
  selectedIds,
  onSelectedIdsChange,
  onView,
  onEdit,
  onDelete,
  onBulkDelete,
  isPending,
}: TechniciansDataTableProps) {
  const visibleIds = React.useMemo(() => technicians.map((t) => t.id), [technicians]);
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

  const columns = React.useMemo<ColumnDef<TechnicianRow>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <RowCheckbox
            checked={allVisibleSelected}
            indeterminate={someVisibleSelected && !allVisibleSelected}
            onChange={toggleAllVisible}
            ariaLabel="Sélectionner tous les techniciens visibles"
          />
        ),
        cell: ({ row }) => (
          <RowCheckbox
            checked={selectedIds.has(row.original.id)}
            onChange={(checked) => toggleRow(row.original.id, checked)}
            ariaLabel={`Sélectionner ${row.original.firstName} ${row.original.lastName}`}
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: "lastName",
        header: "Technicien",
        cell: ({ row }) => (
          <div className="min-w-[140px]">
            <p className="font-semibold text-slate-900">
              {row.original.firstName} {row.original.lastName}
            </p>
            <p className="text-xs text-slate-500">{row.original.employeeCode ?? row.original.email ?? "—"}</p>
          </div>
        ),
      },
      {
        accessorKey: "specialty",
        header: "Spécialité",
        cell: ({ row }) => (
          <Badge variant="secondary" className="font-normal">
            {technicianSpecialtyFr(row.original.specialty)}
          </Badge>
        ),
      },
      {
        accessorKey: "role",
        header: "Rôle",
        cell: ({ row }) => <span className="text-slate-700">{technicianRoleFr(row.original.role)}</span>,
      },
      {
        accessorKey: "availability",
        header: "Statut",
        cell: ({ row }) => (
          <Badge className={cn("font-medium", technicianAvailabilityBadgeClass(row.original.availability))}>
            {technicianAvailabilityFr(row.original.availability)}
          </Badge>
        ),
      },
      {
        accessorKey: "phone",
        header: "Contact",
        cell: ({ row }) => (
          <div className="text-sm text-slate-600">
            <p>{row.original.phone ?? "—"}</p>
            <p className="truncate text-xs">{row.original.email ?? ""}</p>
          </div>
        ),
      },
      {
        accessorKey: "interventionCount",
        header: "Interventions",
        cell: ({ row }) => <span className="tabular-nums text-slate-700">{row.original.interventionCount}</span>,
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
              onClick={() => onView(row.original)}
              aria-label="Voir"
            >
              <Eye className="h-4 w-4" />
            </Button>
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
          </div>
        ),
      },
    ],
    [
      allVisibleSelected,
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
    data: technicians,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const selectedCount = selectedIds.size;

  if (technicians.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-600">
        Aucun technicien ne correspond aux filtres.
      </p>
    );
  }

  return (
    <div className={cn("space-y-4", isPending && "opacity-70 transition-opacity")}>
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
            {table.getFilteredRowModel().rows.length}
          </span>{" "}
          technicien(s)
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
