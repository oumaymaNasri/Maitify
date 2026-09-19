"use client";

import { InterventionType, MaintenanceWorkflowStatus } from "@prisma/client";
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
import { InterventionsCollapseSection } from "@/components/interventions/interventions-collapse-section";
import { InterventionsDataTable } from "@/components/interventions/interventions-data-table";
import { InterventionsExportButtons } from "@/components/interventions/interventions-export-buttons";
import { ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDetailQueryParam } from "@/lib/navigation/use-detail-query-param";
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

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tous" },
  { value: MaintenanceWorkflowStatus.OPEN, label: "À faire" },
  { value: MaintenanceWorkflowStatus.COMPLETED, label: maintenanceWorkflowStatusFr(MaintenanceWorkflowStatus.COMPLETED) },
] as const;

type SectionId = "preventive" | "corrective" | "all";

const SECTIONS_STORAGE_KEY = "nutrifish.gmao.interventions.sections.v1";

function defaultOpenSections(type: TypeFilter): Record<SectionId, boolean> {
  if (type === InterventionType.PREVENTIVE) {
    return { preventive: true, corrective: false, all: false };
  }
  if (type === InterventionType.CORRECTIVE) {
    return { preventive: false, corrective: true, all: false };
  }
  return { preventive: false, corrective: false, all: true };
}

function loadOpenSections(type: TypeFilter): Record<SectionId, boolean> {
  const fallback = defaultOpenSections(type);
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(SECTIONS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Record<SectionId, boolean>>;
    return {
      preventive: Boolean(parsed.preventive),
      corrective: Boolean(parsed.corrective),
      all: parsed.all == null ? true : Boolean(parsed.all),
    };
  } catch {
    return fallback;
  }
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
};

type InterventionsTotals = {
  total: number;
  catalogTotal: number;
};

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
  if (query.status !== "ALL") params.set("status", query.status);
  if (query.sector && query.sector !== "ALL") params.set("sector", query.sector);
  if (query.technicianId && query.technicianId !== "ALL") params.set("technicianId", query.technicianId);
  if (query.dateFrom) params.set("dateFrom", query.dateFrom);
  if (query.dateTo) params.set("dateTo", query.dateTo);
  if (query.sort && query.sort !== "date") params.set("sort", query.sort);
  if (query.dir && query.dir !== "desc") params.set("dir", query.dir);
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
  query,
}: InterventionsModuleClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [rows, setRows] = React.useState(initialRows);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [viewId, setViewId] = React.useState<string | null>(null);
  const [editRow, setEditRow] = React.useState<InterventionListVm | null>(null);
  const [deleteRow, setDeleteRow] = React.useState<InterventionListVm | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);
  const [openSections, setOpenSections] = React.useState<Record<SectionId, boolean>>(() =>
    defaultOpenSections(query.type),
  );

  const persistSections = React.useRef(false);

  React.useEffect(() => {
    setOpenSections(loadOpenSections(query.type));
  }, [query.type]);

  React.useEffect(() => {
    if (!persistSections.current) {
      persistSections.current = true;
      return;
    }
    window.localStorage.setItem(SECTIONS_STORAGE_KEY, JSON.stringify(openSections));
  }, [openSections]);

  React.useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const pushQuery = React.useCallback(
    (next: InterventionsListQuery) => {
      const qs = buildMaintenanceListSearch(next);
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router],
  );

  const patchQuery = React.useCallback(
    (patch: Partial<InterventionsListQuery>) => {
      pushQuery({ ...query, ...patch });
    },
    [pushQuery, query],
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
    [query.status, query.sector, query.technicianId, sectors, technicians, patchQuery],
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

  const preventiveRows = React.useMemo(
    () => rows.filter((r) => r.type === InterventionType.PREVENTIVE),
    [rows],
  );
  const correctiveRows = React.useMemo(
    () => rows.filter((r) => r.type === InterventionType.CORRECTIVE),
    [rows],
  );

  const toggleSection = React.useCallback((id: SectionId) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const tableFor = (list: InterventionListVm[]) => (
    <InterventionsDataTable
      interventions={list}
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
      totals={{ total: list.length, catalogTotal: list.length }}
      embedded
    />
  );

  return (
    <GmaoModuleShell
      title={readOnly ? "Mes interventions" : "Liste de Maintenance"}
      subtitle={`${totals.catalogTotal.toLocaleString("fr-FR")} maintenances importées. Trois sections repliables : préventive, corrective, et liste complète.`}
    >
      <ModuleFilterBar
        onDebouncedSearchChange={handleDebouncedSearch}
        searchPlaceholder="Recherche globale : matricule, machine, rapport, intervenant…"
        searchResetKey={`${query.status}-${query.sector}`}
        resultCount={totals.total}
        action={newInterventionAction}
        exportActions={readOnly ? undefined : <InterventionsExportButtons items={rows} />}
        filters={filters}
      />

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label className="text-xs text-slate-600">Date du</Label>
          <Input type="date" value={query.dateFrom} onChange={(e) => patchQuery({ dateFrom: e.target.value })} className="h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-600">Date au</Label>
          <Input type="date" value={query.dateTo} onChange={(e) => patchQuery({ dateTo: e.target.value })} className="h-9" />
        </div>
      </div>

      <div className="space-y-3">
        <InterventionsCollapseSection
          id="maintenance-preventive"
          title="Maintenance Préventive"
          count={preventiveRows.length}
          open={openSections.preventive}
          onToggle={() => toggleSection("preventive")}
        >
          {tableFor(preventiveRows)}
        </InterventionsCollapseSection>
        <InterventionsCollapseSection
          id="maintenance-corrective"
          title="Maintenance Corrective"
          count={correctiveRows.length}
          open={openSections.corrective}
          onToggle={() => toggleSection("corrective")}
        >
          {tableFor(correctiveRows)}
        </InterventionsCollapseSection>
        <InterventionsCollapseSection
          id="maintenance-toutes"
          title="Toutes les Maintenances"
          count={rows.length}
          open={openSections.all}
          onToggle={() => toggleSection("all")}
        >
          {tableFor(rows)}
        </InterventionsCollapseSection>
      </div>

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
