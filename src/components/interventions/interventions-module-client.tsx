"use client";

import { InterventionType, MaintenanceWorkflowStatus } from "@prisma/client";
import { FileSpreadsheet, Folders, ShieldCheck, Wrench, type LucideIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

import {
  deleteMaintenanceLogAction,
  deleteMaintenanceLogsBulkAction,
} from "@/app/actions/maintenance-log";
import { GmaoModuleShell } from "@/components/gmao/premium/module-shell";
import { ModuleFilterBar } from "@/components/gmao/premium/module-filter-bar";
import type { InterventionListVm } from "@/components/interventions/intervention-types";
import type { MachineOption, TechnicianOption } from "@/components/interventions/InterventionIntelligentForm";
import { InterventionsDataTable } from "@/components/interventions/interventions-data-table";
import { InterventionsExportButtons } from "@/components/interventions/interventions-export-buttons";
import { MaintenanceImportPanel } from "@/components/interventions/maintenance-import-panel";
import { ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDetailQueryParam } from "@/lib/navigation/use-detail-query-param";
import { cn } from "@/lib/utils";
import { formatDateFrMedium } from "@/lib/utils/format-date";
import { maintenanceWorkflowStatusFr } from "@/lib/view/machine-labels";

const InterventionDetailSheet = dynamic(
  () => import("@/components/interventions/intervention-detail-sheet").then((m) => ({ default: m.InterventionDetailSheet })),
  { ssr: false },
);
const InterventionEditDialog = dynamic(
  () => import("@/components/interventions/intervention-edit-dialog").then((m) => ({ default: m.InterventionEditDialog })),
  { ssr: false },
);
const DeleteConfirmDialog = dynamic(
  () => import("@/components/gmao/premium/delete-confirm-dialog").then((m) => ({ default: m.DeleteConfirmDialog })),
  { ssr: false },
);

type StatusFilter = "ALL" | MaintenanceWorkflowStatus;
type TypeFilter = "ALL" | InterventionType;
type ListTabId = "PREVENTIVE" | "CORRECTIVE" | "ALL";
type TabId = ListTabId | "IMPORT";

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tous" },
  { value: MaintenanceWorkflowStatus.OPEN, label: "À faire" },
  { value: MaintenanceWorkflowStatus.COMPLETED, label: maintenanceWorkflowStatusFr(MaintenanceWorkflowStatus.COMPLETED) },
] as const;

function tabFromType(type: TypeFilter): TabId {
  if (type === InterventionType.PREVENTIVE) return "PREVENTIVE";
  if (type === InterventionType.CORRECTIVE) return "CORRECTIVE";
  return "ALL";
}

export type InterventionsListQuery = {
  q: string;
  type: TypeFilter;
  status: StatusFilter;
  sector: string;
  technicianId: string;
  dateFrom: string;
  dateTo: string;
  sort: string;
  dir: "asc" | "desc";
  view?: "import" | "";
};

type InterventionsTotals = {
  total: number;
  catalogTotal: number;
  preventive: number;
  corrective: number;
};

function rowMatchesQuery(row: InterventionListVm, query: InterventionsListQuery, q: string) {
  if (query.status !== "ALL" && row.workflowStatus !== query.status) return false;
  if (query.sector && query.sector !== "ALL") {
    if ((row.sectorMaintenance ?? "").toLowerCase() !== query.sector.toLowerCase()) return false;
  }
  if (query.technicianId && query.technicianId !== "ALL" && row.technicianId !== query.technicianId) {
    return false;
  }
  if (query.dateFrom) {
    const from = Date.parse(`${query.dateFrom}T00:00:00.000Z`);
    if (!Number.isNaN(from) && Date.parse(row.date) < from) return false;
  }
  if (query.dateTo) {
    const to = Date.parse(`${query.dateTo}T23:59:59.999Z`);
    if (!Number.isNaN(to) && Date.parse(row.date) > to) return false;
  }
  if (q) {
    const blob = [
      row.importMatricule,
      row.machineName,
      row.machineLocation,
      row.technicianName,
      row.operation,
      row.failureDescription,
      row.workPerformed,
      row.sectorMaintenance,
      row.service,
      row.linkedFailureCause,
      row.sparePartsLabel,
    ]
      .join(" ")
      .toLowerCase();
    if (!blob.includes(q)) return false;
  }
  return true;
}

function compareRows(a: InterventionListVm, b: InterventionListVm, sort: string, dir: 1 | -1) {
  let cmp = 0;
  switch (sort) {
    case "machineName":
      cmp = a.machineName.localeCompare(b.machineName, "fr");
      break;
    case "type":
      cmp = a.type.localeCompare(b.type);
      break;
    case "importMatricule":
      cmp = (a.importMatricule ?? "").localeCompare(b.importMatricule ?? "", "fr", { numeric: true });
      break;
    case "durationMinutes":
      cmp = (a.durationMinutes ?? -1) - (b.durationMinutes ?? -1);
      break;
    case "technicianName":
      cmp = (a.technicianName ?? "").localeCompare(b.technicianName ?? "", "fr");
      break;
    default:
      cmp = a.date.localeCompare(b.date);
  }
  return cmp * dir || a.id.localeCompare(b.id) * dir;
}

function filterAndSortInterventions(rows: InterventionListVm[], query: InterventionsListQuery, tab: ListTabId) {
  const q = query.q.trim().toLowerCase();
  const base = rows.filter((row) => rowMatchesQuery(row, query, q));
  const preventiveCount = base.filter((r) => r.type === InterventionType.PREVENTIVE).length;
  const correctiveCount = base.filter((r) => r.type === InterventionType.CORRECTIVE).length;
  const typed =
    tab === "PREVENTIVE"
      ? base.filter((r) => r.type === InterventionType.PREVENTIVE)
      : tab === "CORRECTIVE"
        ? base.filter((r) => r.type === InterventionType.CORRECTIVE)
        : base;
  const dir: 1 | -1 = query.dir === "asc" ? 1 : -1;
  const visibleRows = [...typed].sort((a, b) => compareRows(a, b, query.sort, dir));
  return { visibleRows, preventiveCount, correctiveCount, allCount: base.length };
}

type InterventionsModuleClientProps = {
  interventions: InterventionListVm[];
  totals: InterventionsTotals;
  machines: MachineOption[];
  technicians: TechnicianOption[];
  sectors: string[];
  readOnly?: boolean;
  query: InterventionsListQuery;
};

export function buildMaintenanceListSearch(query: InterventionsListQuery): string {
  const params = new URLSearchParams();
  if (query.q.trim()) params.set("q", query.q.trim());
  if (query.type !== "ALL") params.set("type", query.type);
  if (query.status !== "ALL") params.set("status", query.status);
  if (query.sector && query.sector !== "ALL") params.set("sector", query.sector);
  if (query.technicianId && query.technicianId !== "ALL") params.set("technicianId", query.technicianId);
  if (query.dateFrom) params.set("dateFrom", query.dateFrom);
  if (query.dateTo) params.set("dateTo", query.dateTo);
  if (query.sort && query.sort !== "date") params.set("sort", query.sort);
  if (query.dir && query.dir !== "desc") params.set("dir", query.dir);
  if (query.view === "import") params.set("view", "import");
  return params.toString();
}

const newInterventionAction = (
  <ButtonLink href="/interventions/new" size="sm" className="h-9 rounded-xl bg-[#1F76FB] hover:bg-[#1a65d6]">
    Nouvelle intervention
  </ButtonLink>
);

export function InterventionsModuleClient({
  interventions: initialRows,
  totals,
  machines,
  technicians,
  sectors,
  readOnly = false,
  query: initialQuery,
}: InterventionsModuleClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [rows, setRows] = React.useState(initialRows);
  const [query, setQuery] = React.useState(initialQuery);
  const [tab, setTab] = React.useState<TabId>(() =>
    initialQuery.view === "import" ? "IMPORT" : tabFromType(initialQuery.type),
  );
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [viewId, setViewId] = React.useState<string | null>(null);
  const [editRow, setEditRow] = React.useState<InterventionListVm | null>(null);
  const [deleteRow, setDeleteRow] = React.useState<InterventionListVm | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);

  React.useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const patchQuery = React.useCallback(
    (patch: Partial<InterventionsListQuery>) => {
      setQuery((prev) => {
        const next = { ...prev, ...patch };
        const qs = buildMaintenanceListSearch(next);
        if (typeof window !== "undefined") {
          window.history.replaceState(window.history.state, "", qs ? `${pathname}?${qs}` : pathname);
        }
        return next;
      });
    },
    [pathname],
  );

  const selectTab = React.useCallback(
    (next: TabId) => {
      setTab(next);
      setSelectedIds(new Set());
      if (next === "IMPORT") {
        patchQuery({ view: "import", type: "ALL" });
      } else {
        patchQuery({ view: "", type: next });
      }
    },
    [patchQuery],
  );

  const openDetailById = React.useCallback((id: string) => {
    setViewId(id);
  }, []);
  useDetailQueryParam(openDetailById);

  const skipSearchEmit = React.useRef(true);

  const handleDebouncedSearch = React.useCallback(
    (q: string) => {
      if (skipSearchEmit.current) {
        skipSearchEmit.current = false;
        return;
      }
      if (q === query.q) return;
      patchQuery({ q });
    },
    [patchQuery, query.q],
  );

  const filters = React.useMemo(
    () => [
      {
        id: "type",
        label: "Type de maintenance",
        value: query.type === "PREVENTIVE" || query.type === "CORRECTIVE" ? query.type : "ALL",
        onChange: (v: string) => selectTab(v as TabId),
        options: [
          { value: "PREVENTIVE", label: "Préventive" },
          { value: "CORRECTIVE", label: "Corrective" },
          { value: "ALL", label: "Toutes" },
        ],
      },
      {
        id: "status",
        label: "Statut",
        value: query.status,
        onChange: (v: string) => patchQuery({ status: v as StatusFilter }),
        options: [...STATUS_OPTIONS],
      },
      {
        id: "sector",
        label: "Secteur",
        value: query.sector || "ALL",
        onChange: (v: string) => patchQuery({ sector: v }),
        options: [{ value: "ALL", label: "Tous" }, ...sectors.map((s) => ({ value: s, label: s }))],
      },
      {
        id: "technician",
        label: "Intervenant",
        value: query.technicianId || "ALL",
        onChange: (v: string) => patchQuery({ technicianId: v }),
        options: [
          { value: "ALL", label: "Tous" },
          ...technicians.map((t) => ({ value: t.id, label: t.label })),
        ],
      },
    ],
    [query.type, query.status, query.sector, query.technicianId, sectors, technicians, patchQuery, selectTab],
  );

  const handleDeleted = React.useCallback((id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setViewId((prev) => (prev === id ? null : prev));
  }, []);

  const handleBulkDeleted = React.useCallback((ids: string[]) => {
    const removed = new Set(ids);
    setRows((prev) => prev.filter((r) => !removed.has(r.id)));
    setSelectedIds(new Set());
  }, []);

  const { visibleRows, preventiveCount, correctiveCount, allCount } = React.useMemo(
    () => filterAndSortInterventions(rows, query, tab === "IMPORT" ? "ALL" : tab),
    [rows, query, tab],
  );

  const tabs: { id: TabId; label: string; count?: number; icon: LucideIcon }[] = [
    { id: "PREVENTIVE", label: "Maintenance Préventive", count: preventiveCount, icon: ShieldCheck },
    { id: "CORRECTIVE", label: "Maintenance Corrective", count: correctiveCount, icon: Wrench },
    { id: "ALL", label: "Toutes les Maintenances", count: allCount, icon: Folders },
    ...(!readOnly ? [{ id: "IMPORT" as const, label: "Importer des maintenances", icon: FileSpreadsheet }] : []),
  ];

  return (
    <GmaoModuleShell
      className="space-y-3"
      title={readOnly ? "Mes interventions" : "Liste de Maintenance"}
      subtitle={`${totals.catalogTotal.toLocaleString("fr-FR")} maintenances importées — filtrer par sous-module.`}
    >
    <div className="space-y-2">
      <div
        className="flex flex-wrap items-center gap-2"
        role="tablist"
        aria-label="Sous-modules de maintenance"
      >
        {tabs.map((item) => {
          const active = tab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectTab(item.id)}
              className={cn(
                "flex flex-row items-center gap-x-2 rounded-xl border px-3 py-2 text-left transition",
                active
                  ? "border-[#1F76FB]/30 bg-[#E8F1FF] text-[#0B2A5B]"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-[#0B2A5B]",
              )}
            >
              <Icon className="h-5 w-5 shrink-0 text-[#1F76FB]" strokeWidth={1.75} />
              <span className="text-sm font-medium leading-none">
                {item.label}
                {item.count != null ? (
                  <>
                    {" "}
                    <span className={cn("tabular-nums", active ? "text-[#1F76FB]" : "text-slate-400")}>
                      ({item.count.toLocaleString("fr-FR")})
                    </span>
                  </>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>

      {tab === "IMPORT" ? (
        <MaintenanceImportPanel onImported={() => router.refresh()} />
      ) : (
        <>
      <ModuleFilterBar
        layout="inline"
        onDebouncedSearchChange={handleDebouncedSearch}
        searchPlaceholder="Matricule, machine, rapport, intervenant…"
        searchResetKey={`${query.status}-${query.sector}-${tab}`}
        resultCount={visibleRows.length}
        action={newInterventionAction}
        exportActions={readOnly ? undefined : <InterventionsExportButtons items={visibleRows} />}
        filters={filters}
        extras={
          <>
            <div className="w-[10.25rem] min-w-[10.25rem] shrink-0">
              <Label htmlFor="date-from" className="text-[11px] font-medium text-slate-700">
                Date du
              </Label>
              <Input
                id="date-from"
                type="date"
                value={query.dateFrom}
                onChange={(e) => patchQuery({ dateFrom: e.target.value })}
                className="mt-0.5 h-9 border-slate-200 bg-white"
              />
            </div>
            <div className="w-[10.25rem] min-w-[10.25rem] shrink-0">
              <Label htmlFor="date-to" className="text-[11px] font-medium text-slate-700">
                Date au
              </Label>
              <Input
                id="date-to"
                type="date"
                value={query.dateTo}
                onChange={(e) => patchQuery({ dateTo: e.target.value })}
                className="mt-0.5 h-9 border-slate-200 bg-white"
              />
            </div>
          </>
        }
      />

      <InterventionsDataTable
        interventions={visibleRows}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onView={(row) => setViewId(row.id)}
        onEdit={readOnly ? () => {} : setEditRow}
        onDelete={readOnly ? () => {} : setDeleteRow}
        onBulkDelete={readOnly ? () => {} : () => setBulkDeleteOpen(true)}
        readOnly={readOnly}
        serverSort={{
          sort: query.sort,
          dir: query.dir,
          onChange: (sort, dir) => patchQuery({ sort, dir }),
        }}
        totals={{ total: visibleRows.length, catalogTotal: totals.catalogTotal }}
      />
        </>
      )}

      <InterventionDetailSheet
        interventionId={viewId}
        open={Boolean(viewId)}
        onOpenChange={(open) => {
          if (!open) setViewId(null);
        }}
      />

      {!readOnly ? (
        <>
          <InterventionEditDialog
            intervention={editRow}
            open={Boolean(editRow)}
            onOpenChange={(open) => {
              if (!open) setEditRow(null);
            }}
            machines={machines}
            technicians={technicians}
            onUpdated={(updated) => {
              setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
            }}
          />

          <DeleteConfirmDialog
            open={Boolean(deleteRow)}
            onOpenChange={(open) => {
              if (!open) setDeleteRow(null);
            }}
            title="Confirmer la suppression"
            description={
              deleteRow
                ? `Supprimer l'intervention sur « ${deleteRow.machineName} » du ${formatDateFrMedium(deleteRow.date)} ? Action irréversible.`
                : ""
            }
            onConfirm={async () => {
              if (!deleteRow) return { ok: false, error: "Intervention introuvable." };
              const res = await deleteMaintenanceLogAction(deleteRow.id);
              return { ok: res.ok, error: res.ok ? undefined : res.error };
            }}
            onSuccess={() => {
              if (deleteRow) handleDeleted(deleteRow.id);
            }}
          />

          <DeleteConfirmDialog
            open={bulkDeleteOpen}
            onOpenChange={setBulkDeleteOpen}
            title="Supprimer la sélection ?"
            description={`${selectedIds.size} intervention(s) seront définitivement supprimées.`}
            onConfirm={async () => {
              const res = await deleteMaintenanceLogsBulkAction(Array.from(selectedIds));
              if (!res.ok) return { ok: false, error: res.error };
              handleBulkDeleted(res.ids);
              return { ok: true };
            }}
          />
        </>
      ) : null}
    </GmaoModuleShell>
  );
}
