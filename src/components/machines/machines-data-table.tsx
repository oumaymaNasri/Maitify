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

import { GMAO_TABLE_HEAD, GMAO_TABLE_WRAP } from "@/components/gmao/table-styles";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { maintenanceFrequencyFr } from "@/lib/view/gmao-labels";
import {
  formatLastIntervention,
  machineAssetStatusFr,
  machineStatusBadgeClass,
} from "@/lib/view/machine-labels";
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

type MachinesDataTableProps = {
  machines: MachineCardVm[];
  selectedIds: Set<string>;
  onSelectedIdsChange: (ids: Set<string>) => void;
  onEdit: (machine: MachineCardVm) => void;
  onDelete: (machine: MachineCardVm) => void;
  onBulkDelete: () => void;
  isPending?: boolean;
};

export function MachinesDataTable({
  machines,
  selectedIds,
  onSelectedIdsChange,
  onEdit,
  onDelete,
  onBulkDelete,
  isPending,
}: MachinesDataTableProps) {
  const visibleIds = React.useMemo(() => machines.map((m) => m.id), [machines]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id));

  const toggleAllVisible = React.useCallback(
    (checked: boolean) => {
      const next = new Set(selectedIds);
      if (checked) {
        visibleIds.forEach((id) => next.add(id));
      } else {
        visibleIds.forEach((id) => next.delete(id));
      }
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

  const columns = React.useMemo<ColumnDef<MachineCardVm>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <RowCheckbox
            checked={allVisibleSelected}
            indeterminate={someVisibleSelected && !allVisibleSelected}
            onChange={toggleAllVisible}
            ariaLabel="Sélectionner toutes les machines visibles"
          />
        ),
        cell: ({ row }) => (
          <RowCheckbox
            checked={selectedIds.has(row.original.id)}
            onChange={(checked) => toggleRow(row.original.id, checked)}
            ariaLabel={`Sélectionner ${row.original.name}`}
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: "name",
        header: "Équipement",
        cell: ({ row }) => (
          <div className="min-w-[140px]">
            <p className="font-semibold text-slate-900">{row.original.name}</p>
            <p className="text-xs text-slate-500">
              {row.original.legacyMatricule != null
                ? `M${row.original.legacyMatricule}`
                : row.original.id.slice(0, 8)}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "location",
        header: "Emplacement",
        cell: ({ row }) => <span className="text-slate-700">{row.original.location}</span>,
      },
      {
        accessorKey: "assetStatus",
        header: "Statut",
        cell: ({ row }) => (
          <Badge className={cn("font-medium", machineStatusBadgeClass(row.original.assetStatus))}>
            {machineAssetStatusFr(row.original.assetStatus)}
          </Badge>
        ),
      },
      {
        accessorKey: "maintenanceSector",
        header: "Fréquence",
        cell: ({ row }) => (
          <span className="text-slate-700">{maintenanceFrequencyFr(row.original.maintenanceSector)}</span>
        ),
      },
      {
        accessorKey: "targetAvailability",
        header: "Charge utile",
        cell: ({ row }) => (
          <span className="tabular-nums font-medium text-[#1F76FB]">
            {row.original.targetAvailability != null
              ? `${Math.round(row.original.targetAvailability * 100)}%`
              : "—"}
          </span>
        ),
      },
      {
        accessorKey: "interventionCount",
        header: "Interventions",
        cell: ({ row }) => (
          <span className="tabular-nums text-slate-700">{row.original.interventionCount}</span>
        ),
      },
      {
        accessorKey: "lastInterventionAt",
        header: "Dernière int.",
        cell: ({ row }) => (
          <span className="text-xs text-slate-600">{formatLastIntervention(row.original.lastInterventionAt)}</span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <ButtonLink
              href={`/machines/${row.original.id}/historique`}
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl text-[#1F76FB] hover:bg-[#E8F1FF]"
              aria-label={`Historique de ${row.original.name}`}
            >
              <Eye className="h-4 w-4" />
            </ButtonLink>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-[#1F76FB]"
              onClick={() => onEdit(row.original)}
              aria-label={`Modifier ${row.original.name}`}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600"
              onClick={() => onDelete(row.original)}
              aria-label={`Supprimer ${row.original.name}`}
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
      onEdit,
      onDelete,
    ],
  );

  const table = useReactTable({
    data: machines,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const selectedCount = selectedIds.size;

  if (machines.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-600">
        Aucun équipement ne correspond aux filtres.
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

      <div className={GMAO_TABLE_WRAP}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="border-0 hover:bg-transparent">
                {hg.headers.map((h) => (
                  <TableHead
                    key={h.id}
                    className={GMAO_TABLE_HEAD}
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
          équipement(s)
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
