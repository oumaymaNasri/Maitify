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
import type { TechnicianRow } from "@/lib/gmao/technicians-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  technicianAvailabilityFr,
  technicianRoleFr,
  technicianSpecialtyFr,
} from "@/lib/view/gmao-labels";
import { technicianAvailabilityBadgeClass } from "@/lib/view/status-badges";
import { cn } from "@/lib/utils";

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
  const [sorting, setSorting] = React.useState<SortingState>([]);
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
        enableSorting: false,
        header: () => (
          <GmaoRowCheckbox
            checked={allVisibleSelected}
            indeterminate={someVisibleSelected && !allVisibleSelected}
            onChange={toggleAllVisible}
            ariaLabel="Sélectionner tous les techniciens visibles"
          />
        ),
        cell: ({ row }) => (
          <GmaoRowCheckbox
            checked={selectedIds.has(row.original.id)}
            onChange={(checked) => toggleRow(row.original.id, checked)}
            ariaLabel={`Sélectionner ${row.original.firstName} ${row.original.lastName}`}
          />
        ),
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
          <Badge variant="secondary" className="rounded-full font-normal">
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
          <Badge className={cn("rounded-full font-medium", technicianAvailabilityBadgeClass(row.original.availability))}>
            {technicianAvailabilityFr(row.original.availability)}
          </Badge>
        ),
      },
      {
        accessorKey: "phone",
        header: "Contact",
        enableSorting: false,
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
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-0.5">
            <Button type="button" variant="ghost" size="icon" className={GMAO_ICON_VIEW} onClick={() => onView(row.original)} aria-label="Voir">
              <Eye className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className={GMAO_ICON_EDIT} onClick={() => onEdit(row.original)} aria-label="Modifier">
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className={GMAO_ICON_DELETE} onClick={() => onDelete(row.original)} aria-label="Supprimer">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [allVisibleSelected, someVisibleSelected, selectedIds, toggleAllVisible, toggleRow, onView, onEdit, onDelete],
  );

  const table = useReactTable({
    data: technicians,
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
        emptyMessage="Aucun technicien ne correspond aux filtres."
        selectedIdSet={selectedIds}
        getRowId={(row) => row.id}
        isPending={isPending}
      />
      <GmaoTablePagination total={technicians.length} noun="technicien(s)" />
    </div>
  );
}
