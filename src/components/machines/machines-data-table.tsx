"use client";

import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { Edit2, Eye, Trash2 } from "lucide-react";
import * as React from "react";

import {
  GmaoBulkSelectBar,
  GmaoRowCheckbox,
  GmaoStandardTable,
  GmaoTablePagination,
} from "@/components/gmao/gmao-table";
import { GMAO_ICON_DELETE, GMAO_ICON_EDIT, GMAO_ICON_VIEW } from "@/components/gmao/table-styles";
import type { MachineCardVm } from "@/components/machines/machine-card";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { maintenanceFrequencyFr } from "@/lib/view/gmao-labels";
import {
  formatLastIntervention,
  machineAssetStatusFr,
  machineStatusBadgeClass,
} from "@/lib/view/machine-labels";
import { cn } from "@/lib/utils";

type MachinesDataTableProps = {
  machines: MachineCardVm[];
  selectedIds: Set<string>;
  onSelectedIdsChange: (ids: Set<string>) => void;
  onEdit: (machine: MachineCardVm) => void;
  onDelete: (machine: MachineCardVm) => void;
  onBulkDelete: () => void;
  isPending?: boolean;
  pagination?: { page: number; pageCount: number; total: number; pageSize?: number };
};

export function MachinesDataTable({
  machines,
  selectedIds,
  onSelectedIdsChange,
  onEdit,
  onDelete,
  onBulkDelete,
  isPending,
  pagination,
}: MachinesDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const visibleIds = React.useMemo(() => machines.map((m) => m.id), [machines]);
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

  const columns = React.useMemo<ColumnDef<MachineCardVm>[]>(
    () => [
      {
        id: "select",
        enableSorting: false,
        header: () => (
          <GmaoRowCheckbox
            checked={allVisibleSelected}
            indeterminate={someVisibleSelected && !allVisibleSelected}
            onChange={toggleAllVisible}
            ariaLabel="Sélectionner toutes les machines visibles"
          />
        ),
        cell: ({ row }) => (
          <GmaoRowCheckbox
            checked={selectedIds.has(row.original.id)}
            onChange={(checked) => toggleRow(row.original.id, checked)}
            ariaLabel={`Sélectionner ${row.original.name}`}
          />
        ),
      },
      {
        accessorKey: "name",
        header: "Équipement",
        cell: ({ row }) => (
          <div className="min-w-[140px]">
            <p className="font-semibold text-slate-900">{row.original.name}</p>
            <p className="text-xs text-slate-500">
              {row.original.legacyMatricule != null ? `M${row.original.legacyMatricule}` : row.original.id.slice(0, 8)}
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
          <Badge className={cn("rounded-full font-medium", machineStatusBadgeClass(row.original.assetStatus))}>
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
            {row.original.targetAvailability != null ? `${Math.round(row.original.targetAvailability * 100)}%` : "—"}
          </span>
        ),
      },
      {
        accessorKey: "interventionCount",
        header: "Interventions",
        cell: ({ row }) => <span className="tabular-nums text-slate-700">{row.original.interventionCount}</span>,
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
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-0.5">
            <ButtonLink
              href={`/machines/${row.original.id}/historique`}
              variant="ghost"
              size="icon"
              className={GMAO_ICON_VIEW}
              aria-label={`Historique de ${row.original.name}`}
            >
              <Eye className="h-4 w-4" />
            </ButtonLink>
            <Button type="button" variant="ghost" size="icon" className={GMAO_ICON_EDIT} onClick={() => onEdit(row.original)} aria-label={`Modifier ${row.original.name}`}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className={GMAO_ICON_DELETE} onClick={() => onDelete(row.original)} aria-label={`Supprimer ${row.original.name}`}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [allVisibleSelected, someVisibleSelected, selectedIds, toggleAllVisible, toggleRow, onEdit, onDelete],
  );

  const table = useReactTable({
    data: machines,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-3">
      <GmaoBulkSelectBar count={selectedIds.size} onBulkDelete={onBulkDelete} />
      <GmaoStandardTable
        table={table}
        emptyMessage="Aucun équipement ne correspond aux filtres."
        selectedIdSet={selectedIds}
        getRowId={(row) => row.id}
        isPending={isPending}
      />
      <GmaoTablePagination
        total={pagination?.total ?? machines.length}
        noun="équipement(s)"
        page={pagination?.page}
        pageCount={pagination?.pageCount}
        pageSize={pagination?.pageSize}
        previousHref={
          pagination && pagination.page > 1
            ? pagination.page - 1 > 1
              ? `/donnees-de-base/machines?page=${pagination.page - 1}`
              : "/donnees-de-base/machines"
            : undefined
        }
        nextHref={
          pagination && pagination.page < pagination.pageCount
            ? `/donnees-de-base/machines?page=${pagination.page + 1}`
            : undefined
        }
      />
    </div>
  );
}
