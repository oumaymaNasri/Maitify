"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import type { ColumnDef, ColumnOrderState, ColumnSizingState, VisibilityState } from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Columns3, Edit2, Eye, GripVertical, Trash2 } from "lucide-react";
import * as React from "react";

import type { InterventionListVm } from "@/components/interventions/intervention-types";
import { InterventionFicheButton } from "@/components/interventions/intervention-fiche-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateFrShort, formatDurationMinutes } from "@/lib/utils/format-date";
import { failureCauseFr, operationTypeFr } from "@/lib/view/gmao-labels";
import { interventionTypeFr } from "@/lib/view/labels";
import { maintenanceWorkflowStatusFr } from "@/lib/view/machine-labels";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "nutrifish.gmao.interventions.table.v1";
const ROW_HEIGHT = 40;

const COLUMN_LABELS: Record<string, string> = {
  select: "Sélection",
  importMatricule: "Matricule",
  date: "Date",
  sectorMaintenance: "Secteur Maintenance",
  service: "Service",
  technicianName: "Intervenant",
  machineName: "Nom de la machine",
  machineLocation: "Emplacement",
  failureDescription: "Description de dysfonctionnement",
  operation: "Opération",
  type: "Type de maintenance",
  failureCauseLabel: "Cause de défaillance",
  linkedFailureCause: "Cause liée à la défaillance",
  durationMinutes: "Temps d'intervention",
  workPerformed: "Rapport d'intervention",
  difficulties: "Difficultés rencontrées",
  sparePartsLabel: "Pièce de rechange et consommables",
  actions: "Actions",
};

const DEFAULT_ORDER = Object.keys(COLUMN_LABELS);

type PersistedTableState = {
  columnOrder?: string[];
  columnVisibility?: VisibilityState;
  columnSizing?: ColumnSizingState;
};

function loadTableState(): PersistedTableState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedTableState) : {};
  } catch {
    return {};
  }
}

function CellText({ value, className }: { value: string | null | undefined; className?: string }) {
  const text = value?.trim() ? value : "—";
  return (
    <p className={cn("max-w-[280px] truncate text-sm text-slate-700", className)} title={text}>
      {text}
    </p>
  );
}

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

export type ServerSortProps = {
  sort: string;
  dir: "asc" | "desc";
  onChange: (sort: string, dir: "asc" | "desc") => void;
};

type InterventionsDataTableProps = {
  interventions: InterventionListVm[];
  selectedIds: Set<string>;
  onSelectedIdsChange: (ids: Set<string>) => void;
  onView: (row: InterventionListVm) => void;
  onEdit: (row: InterventionListVm) => void;
  onDelete: (row: InterventionListVm) => void;
  onBulkDelete: () => void;
  readOnly?: boolean;
  totals: { total: number; catalogTotal: number };
  serverSort: ServerSortProps;
  embedded?: boolean;
};

export function InterventionsDataTable({
  interventions,
  selectedIds,
  onSelectedIdsChange,
  onView,
  onEdit,
  onDelete,
  onBulkDelete,
  readOnly = false,
  totals,
  serverSort,
  embedded = false,
}: InterventionsDataTableProps) {
  const persisted = React.useMemo(() => loadTableState(), []);
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>(persisted.columnOrder ?? DEFAULT_ORDER);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(persisted.columnVisibility ?? {});
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>(persisted.columnSizing ?? {});
  const dragCol = React.useRef<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ columnOrder, columnVisibility, columnSizing }),
    );
  }, [columnOrder, columnVisibility, columnSizing]);

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

  const columns = React.useMemo<ColumnDef<InterventionListVm>[]>(() => {
    const cols: ColumnDef<InterventionListVm>[] = [];
    if (!readOnly) {
      cols.push({
        id: "select",
        header: () => (
          <RowCheckbox
            checked={allVisibleSelected}
            indeterminate={someVisibleSelected && !allVisibleSelected}
            onChange={toggleAllVisible}
            ariaLabel="Sélectionner toutes les lignes"
          />
        ),
        cell: ({ row }) => (
          <RowCheckbox
            checked={selectedIds.has(row.original.id)}
            onChange={(checked) => toggleRow(row.original.id, checked)}
            ariaLabel={`Sélectionner ${row.original.machineName}`}
          />
        ),
        size: 44,
        enableResizing: false,
        enableSorting: false,
      });
    }
    cols.push(
      { accessorKey: "importMatricule", header: "Matricule", size: 110, cell: ({ row }) => <CellText value={row.original.importMatricule} className="font-mono text-xs" /> },
      {
        accessorKey: "date",
        header: "Date",
        size: 110,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm tabular-nums text-slate-800" suppressHydrationWarning>
            {formatDateFrShort(row.original.date)}
          </span>
        ),
      },
      { accessorKey: "sectorMaintenance", header: "Secteur Maintenance", size: 150, cell: ({ row }) => <CellText value={row.original.sectorMaintenance} /> },
      { accessorKey: "service", header: "Service", size: 120, cell: ({ row }) => <CellText value={row.original.service} /> },
      { accessorKey: "technicianName", header: "Intervenant", size: 140, cell: ({ row }) => <CellText value={row.original.technicianName} /> },
      { accessorKey: "machineName", header: "Nom de la machine", size: 180, cell: ({ row }) => <p className="max-w-[220px] truncate font-semibold text-slate-900" title={row.original.machineName}>{row.original.machineName}</p> },
      { accessorKey: "machineLocation", header: "Emplacement", size: 140, cell: ({ row }) => <CellText value={row.original.machineLocation} /> },
      { accessorKey: "failureDescription", header: "Description de dysfonctionnement", size: 220, cell: ({ row }) => <CellText value={row.original.failureDescription} /> },
      { accessorKey: "operation", header: "Opération", size: 150, cell: ({ row }) => <CellText value={row.original.operation || operationTypeFr(row.original.operationType)} /> },
      {
        accessorKey: "type",
        header: "Type de maintenance",
        size: 150,
        cell: ({ row }) => (
          <Badge variant={row.original.type === "CORRECTIVE" ? "warning" : "secondary"} className="font-normal">
            {interventionTypeFr(row.original.type)}
          </Badge>
        ),
      },
      {
        accessorKey: "failureCauseLabel",
        header: "Cause de défaillance",
        size: 160,
        cell: ({ row }) => (
          <CellText value={row.original.failureCauseLabel || (row.original.failureCause ? failureCauseFr(row.original.failureCause) : null)} />
        ),
      },
      { accessorKey: "linkedFailureCause", header: "Cause liée à la défaillance", size: 180, cell: ({ row }) => <CellText value={row.original.linkedFailureCause} /> },
      {
        accessorKey: "durationMinutes",
        header: "Temps d'intervention",
        size: 120,
        cell: ({ row }) => (
          <span className="tabular-nums text-sm text-slate-700">
            {formatDurationMinutes(row.original.durationMinutes)}
          </span>
        ),
      },
      { accessorKey: "workPerformed", header: "Rapport d'intervention", size: 240, cell: ({ row }) => <CellText value={row.original.workPerformed} /> },
      { accessorKey: "difficulties", header: "Difficultés rencontrées", size: 180, cell: ({ row }) => <CellText value={row.original.difficulties} /> },
      { accessorKey: "sparePartsLabel", header: "Pièce de rechange et consommables", size: 240, cell: ({ row }) => <CellText value={row.original.sparePartsLabel} /> },
      {
        id: "actions",
        header: "Actions",
        size: 148,
        enableResizing: false,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-0.5">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-[#1F76FB] hover:bg-[#E8F1FF]" onClick={() => onView(row.original)} aria-label="Voir">
              <Eye className="h-4 w-4" />
            </Button>
            {!readOnly ? (
              <>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-slate-600 hover:bg-slate-100" onClick={() => onEdit(row.original)} aria-label="Modifier">
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => onDelete(row.original)} aria-label="Supprimer">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            ) : null}
            <InterventionFicheButton interventionId={row.original.id} machineName={row.original.machineName} size="icon" variant="ghost" useApi />
          </div>
        ),
      },
    );
    return cols;
  }, [allVisibleSelected, someVisibleSelected, selectedIds, readOnly, onView, onEdit, onDelete, toggleAllVisible, toggleRow]);

  const table = useReactTable({
    data: interventions,
    columns,
    state: { columnOrder, columnVisibility, columnSizing },
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    columnResizeMode: "onChange",
    enableColumnResizing: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  const tableRows = table.getRowModel().rows;
  const rowVirtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 18,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0]!.start : 0;
  const paddingBottom =
    virtualRows.length > 0 ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1]!.end : 0;

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [interventions]);

  const sortable = new Set(["date", "machineName", "type", "importMatricule", "durationMinutes", "technicianName"]);

  function cycleSort(id: string) {
    if (!sortable.has(id)) return;
    if (serverSort.sort === id) {
      serverSort.onChange(id, serverSort.dir === "asc" ? "desc" : "asc");
    } else {
      serverSort.onChange(id, id === "date" ? "desc" : "asc");
    }
  }

  return (
    <div className={cn(embedded ? "overflow-hidden rounded-xl border border-slate-100 bg-white" : "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm")}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
        <p className="text-xs text-slate-500">
          {totals.catalogTotal.toLocaleString("fr-FR")} maintenances au total
          {totals.catalogTotal !== totals.total
            ? ` · ${totals.total.toLocaleString("fr-FR")} affichées avec le filtre`
            : ` · ${totals.total.toLocaleString("fr-FR")} lignes dans le tableau`}
        </p>
        <div className="flex items-center gap-2">
          {!readOnly && selectedIds.size > 0 ? (
            <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg text-rose-600" onClick={onBulkDelete}>
              Supprimer ({selectedIds.size})
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg">
                <Columns3 className="mr-1.5 h-3.5 w-3.5" />
                Colonnes
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 w-72 overflow-y-auto">
              <DropdownMenuLabel>Afficher / masquer</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table.getAllLeafColumns().map((col) => {
                if (col.id === "select" || col.id === "actions") return null;
                return (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    checked={col.getIsVisible()}
                    onCheckedChange={(v) => col.toggleVisibility(Boolean(v))}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {COLUMN_LABELS[col.id] ?? col.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div ref={scrollRef} className="h-[75vh] max-h-[800px] overflow-x-auto overflow-y-auto">
        <table className="w-max min-w-full border-separate border-spacing-0 text-sm" style={{ tableLayout: "fixed" }}>
          <thead className="sticky top-0 z-20 bg-slate-50 shadow-[0_1px_0_#e2e8f0]">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const id = header.column.id;
                  const canSort = sortable.has(id);
                  const isSorted = serverSort.sort === id;
                  return (
                    <th
                      key={header.id}
                      draggable={id !== "select"}
                      onDragStart={() => {
                        dragCol.current = id;
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        const from = dragCol.current;
                        dragCol.current = null;
                        if (!from || from === id) return;
                        setColumnOrder((prev) => {
                          const next = (prev.length ? prev : DEFAULT_ORDER).filter((c) => c !== from);
                          const idx = next.indexOf(id);
                          next.splice(idx < 0 ? next.length : idx, 0, from);
                          return next;
                        });
                      }}
                      style={{ width: header.getSize() }}
                      className="relative border-b border-r border-slate-200 bg-slate-50 px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600"
                    >
                      <button
                        type="button"
                        className={cn("flex w-full items-center gap-1 text-left", canSort && "hover:text-[#1F76FB]")}
                        onClick={() => cycleSort(id)}
                      >
                        {id !== "select" ? <GripVertical className="h-3 w-3 shrink-0 text-slate-300" /> : null}
                        <span className="truncate">{flexRender(header.column.columnDef.header, header.getContext())}</span>
                        {isSorted ? <span className="text-[#1F76FB]">{serverSort.dir === "asc" ? "↑" : "↓"}</span> : null}
                      </button>
                      {header.column.getCanResize() ? (
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-[#1F76FB]"
                        />
                      ) : null}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {tableRows.length === 0 ? (
              <tr>
                <td colSpan={table.getVisibleLeafColumns().length} className="px-4 py-12 text-center text-slate-500">
                  Aucune intervention ne correspond aux filtres.
                </td>
              </tr>
            ) : (
              <>
                {paddingTop > 0 ? (
                  <tr aria-hidden>
                    <td colSpan={table.getVisibleLeafColumns().length} style={{ height: paddingTop, padding: 0, border: 0 }} />
                  </tr>
                ) : null}
                {virtualRows.map((virtualRow) => {
                  const row = tableRows[virtualRow.index]!;
                  return (
                    <tr
                      key={row.id}
                      data-index={virtualRow.index}
                      className={cn(
                        "hover:bg-[#F3F8FF]",
                        virtualRow.index % 2 === 0 ? "bg-white" : "bg-slate-50/60",
                      )}
                      style={{ height: ROW_HEIGHT }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          style={{ width: cell.column.getSize() }}
                          className="border-b border-r border-slate-100 px-2 py-1.5 align-top"
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {paddingBottom > 0 ? (
                  <tr aria-hidden>
                    <td colSpan={table.getVisibleLeafColumns().length} style={{ height: paddingBottom, padding: 0, border: 0 }} />
                  </tr>
                ) : null}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
