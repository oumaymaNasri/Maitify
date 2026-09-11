"use client";

import { MaintenanceWorkflowStatus, OperationType } from "@prisma/client";
import dynamic from "next/dynamic";
import Link from "next/link";
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
import { useDetailQueryParam } from "@/lib/navigation/use-detail-query-param";
import { formatDateFrMedium } from "@/lib/utils/format-date";
import { operationTypeFr } from "@/lib/view/gmao-labels";
import { maintenanceWorkflowStatusFr } from "@/lib/view/machine-labels";
import { fuzzyMatch } from "@/lib/utils/fuzzy";

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
type OperationFilter = "ALL" | OperationType;
type DateFilter = "ALL" | "7" | "30" | "90";
type InterventionSearchRow = InterventionListVm & { searchBlob: string };

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tous" },
  { value: MaintenanceWorkflowStatus.OPEN, label: maintenanceWorkflowStatusFr(MaintenanceWorkflowStatus.OPEN) },
  {
    value: MaintenanceWorkflowStatus.COMPLETED,
    label: maintenanceWorkflowStatusFr(MaintenanceWorkflowStatus.COMPLETED),
  },
] as const;

const OPERATION_OPTIONS = [
  { value: "ALL", label: "Toutes" },
  ...Object.values(OperationType).map((op) => ({ value: op, label: operationTypeFr(op) })),
];

const DATE_OPTIONS = [
  { value: "ALL", label: "Toutes dates" },
  { value: "7", label: "7 derniers jours" },
  { value: "30", label: "30 derniers jours" },
  { value: "90", label: "90 derniers jours" },
];

function buildSearchRows(rows: InterventionListVm[]): InterventionSearchRow[] {
  return rows.map((r) => ({
    ...r,
    searchBlob: `${r.id} ${r.machineName} ${r.machineLocation} ${r.technicianName ?? ""} ${r.operation ?? ""} ${operationTypeFr(r.operationType)} ${r.importSource ?? ""}`,
  }));
}

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
  readOnly?: boolean;
};

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
  readOnly = false,
}: InterventionsModuleClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [rows, setRows] = React.useState(initialRows);
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [status, setStatus] = React.useState<StatusFilter>("ALL");
  const [operation, setOperation] = React.useState<OperationFilter>("ALL");
  const [dateRange, setDateRange] = React.useState<DateFilter>("ALL");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [viewId, setViewId] = React.useState<string | null>(null);
  const [editRow, setEditRow] = React.useState<InterventionListVm | null>(null);
  const [deleteRow, setDeleteRow] = React.useState<InterventionListVm | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);
  const [, startFilterTransition] = React.useTransition();

  const handleDebouncedSearch = React.useCallback((value: string) => {
    setDebouncedQ(value);
  }, []);

  const openDetailById = React.useCallback((id: string) => {
    setViewId(id);
  }, []);

  useDetailQueryParam(openDetailById);

  React.useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const goToPage = React.useCallback(
    (nextPage: number) => {
      const safe = Math.max(1, Math.min(nextPage, pagination.pageCount));
      if (safe === pagination.page) return;
      const params = new URLSearchParams();
      if (safe > 1) params.set("page", String(safe));
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pagination.page, pagination.pageCount, pathname, router],
  );

  const searchRows = React.useMemo(() => buildSearchRows(rows), [rows]);

  const filtered = React.useMemo(() => {
    const needle = debouncedQ.trim();
    let cutoff = 0;
    if (mounted) {
      const now = Date.now();
      if (dateRange === "7") cutoff = now - 7 * 86400000;
      else if (dateRange === "30") cutoff = now - 30 * 86400000;
      else if (dateRange === "90") cutoff = now - 90 * 86400000;
    }

    return searchRows.filter((r) => {
      if (status !== "ALL" && r.workflowStatus !== status) return false;
      if (operation !== "ALL" && r.operationType !== operation) return false;
      if (mounted && cutoff > 0 && new Date(r.date).getTime() < cutoff) return false;
      if (!needle) return true;
      return fuzzyMatch(needle, r.searchBlob);
    });
  }, [searchRows, debouncedQ, status, operation, dateRange, mounted]);

  React.useEffect(() => {
    const visible = new Set(filtered.map((r) => r.id));
    setSelectedIds((prev) => {
      const next = new Set(Array.from(prev).filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [filtered]);

  const filters = React.useMemo(
    () => [
      {
        id: "status",
        label: "Statut",
        value: status,
        onChange: (v: string) => startFilterTransition(() => setStatus(v as StatusFilter)),
        options: [...STATUS_OPTIONS],
      },
      {
        id: "operation",
        label: "Type d'opération",
        value: operation,
        onChange: (v: string) => startFilterTransition(() => setOperation(v as OperationFilter)),
        options: OPERATION_OPTIONS,
      },
      {
        id: "date",
        label: "Date",
        value: dateRange,
        onChange: (v: string) => startFilterTransition(() => setDateRange(v as DateFilter)),
        options: DATE_OPTIONS,
      },
    ],
    [status, operation, dateRange],
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
    <GmaoModuleShell title={readOnly ? "Mes interventions" : "Liste de Maintenance"}>
      <ModuleFilterBar
        onDebouncedSearchChange={handleDebouncedSearch}
        searchPlaceholder="Recherche : machine, opération…"
        resultCount={pagination.total}
        action={newInterventionAction}
        exportActions={readOnly ? undefined : <InterventionsExportButtons items={filtered} />}
        filters={filters}
      />

      <InterventionsDataTable
        interventions={filtered}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onView={(row) => setViewId(row.id)}
        onEdit={readOnly ? () => {} : setEditRow}
        onDelete={readOnly ? () => {} : setDeleteRow}
        onBulkDelete={readOnly ? () => {} : () => setBulkDeleteOpen(true)}
        readOnly={readOnly}
        serverPagination={{
          page: pagination.page,
          pageCount: pagination.pageCount,
          total: pagination.total,
          onPrevious: () => goToPage(pagination.page - 1),
          onNext: () => goToPage(pagination.page + 1),
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
