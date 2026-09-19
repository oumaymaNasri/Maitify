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
import { InterventionsDataTable } from "@/components/interventions/interventions-data-table";
import { InterventionsExportButtons } from "@/components/interventions/interventions-export-buttons";
import { ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDetailQueryParam } from "@/lib/navigation/use-detail-query-param";
import { formatDateFrMedium } from "@/lib/utils/format-date";
import { interventionTypeFr } from "@/lib/view/labels";
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

const TYPE_OPTIONS = [
  { value: "ALL", label: "Tous" },
  { value: InterventionType.PREVENTIVE, label: interventionTypeFr(InterventionType.PREVENTIVE) },
  { value: InterventionType.CORRECTIVE, label: interventionTypeFr(InterventionType.CORRECTIVE) },
  { value: InterventionType.AMELIORATION, label: interventionTypeFr(InterventionType.AMELIORATION) },
] as const;

export type InterventionsListQuery = {
  page: number;
  pageSize: number;
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

type InterventionsPagination = {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
};

type InterventionsModuleClientProps = {
  interventions: InterventionListVm[];
  pagination: InterventionsPagination;
  machines: MachineOption[];
  technicians: TechnicianOption[];
  sectors: string[];
  readOnly?: boolean;
  query: InterventionsListQuery;
};

export function buildMaintenanceListSearch(query: InterventionsListQuery): string {
  const params = new URLSearchParams();
  if (query.page > 1) params.set("page", String(query.page));
  if (query.pageSize !== 50) params.set("pageSize", String(query.pageSize));
  if (query.q.trim()) params.set("q", query.q.trim());
  if (query.type !== "ALL") params.set("type", query.type);
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
  pagination,
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
      pushQuery({ ...query, page: 1, ...patch });
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
        id: "type",
        label: "Type de maintenance",
        value: query.type,
        onChange: (v: string) => patchQuery({ type: v as TypeFilter }),
        options: [...TYPE_OPTIONS],
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
    [query.type, query.status, query.sector, query.technicianId, sectors, technicians, patchQuery],
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

  return (
    <GmaoModuleShell
      title={readOnly ? "Mes interventions" : "Liste de Maintenance"}
      subtitle="Tableau type tableur : filtres serveur, tri, colonnes déplaçables et redimensionnables. Pagination pour 3 437 lignes Excel."
    >
      <ModuleFilterBar
        onDebouncedSearchChange={handleDebouncedSearch}
        searchPlaceholder="Recherche globale : matricule, machine, rapport, intervenant…"
        searchResetKey={`${query.type}-${query.status}-${query.sector}`}
        resultCount={pagination.total}
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

      <InterventionsDataTable
        interventions={rows}
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
          onChange: (sort, dir) => patchQuery({ sort, dir, page: pagination.page }),
        }}
        serverPagination={{
          page: pagination.page,
          pageCount: pagination.pageCount,
          total: pagination.total,
          pageSize: pagination.pageSize,
          onPrevious: () => pushQuery({ ...query, page: Math.max(1, pagination.page - 1) }),
          onNext: () => pushQuery({ ...query, page: Math.min(pagination.pageCount, pagination.page + 1) }),
          onPageSizeChange: (pageSize) => patchQuery({ pageSize, page: 1 }),
        }}
      />

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
