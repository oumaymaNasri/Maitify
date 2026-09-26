"use client";

import { MaintenanceOrderStatus } from "@prisma/client";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

import { deleteMaintenanceOrderAction, deleteMaintenanceOrdersBulkAction, reopenMaintenanceOrderAction, reopenMaintenanceOrdersBulkAction, bulkUpdateMaintenanceOrdersAction } from "@/app/actions/maintenance-order";
import { BulkEditDialog, type BulkEditField } from "@/components/gmao/bulk-edit-dialog";
import { GmaoModuleShell } from "@/components/gmao/premium/module-shell";
import { ModuleFilterBar } from "@/components/gmao/premium/module-filter-bar";
import type { MachineOption } from "@/components/maintenance-orders/add-maintenance-order-sheet";
import { CloseOrdersPeriodDialog } from "@/components/maintenance-orders/close-orders-period-dialog";
import { MaintenanceOrdersDataTable } from "@/components/maintenance-orders/maintenance-orders-data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MaintenanceOrderRow } from "@/lib/gmao/maintenance-orders-query";
import { hrefWithPage, pageSizeQueryValue } from "@/lib/db/pagination";
import { useDetailQueryParam } from "@/lib/navigation/use-detail-query-param";
import { maintenanceOrderStatusFr } from "@/lib/view/gmao-labels";

const AddMaintenanceOrderSheet = dynamic(
  () =>
    import("@/components/maintenance-orders/add-maintenance-order-sheet").then((m) => ({
      default: m.AddMaintenanceOrderSheet,
    })),
  { ssr: false },
);
const MaintenanceOrderDetailSheet = dynamic(
  () =>
    import("@/components/maintenance-orders/maintenance-order-detail-sheet").then((m) => ({
      default: m.MaintenanceOrderDetailSheet,
    })),
  { ssr: false },
);
const MaintenanceOrderEditDialog = dynamic(
  () =>
    import("@/components/maintenance-orders/maintenance-order-edit-dialog").then((m) => ({
      default: m.MaintenanceOrderEditDialog,
    })),
  { ssr: false },
);
const DeleteConfirmDialog = dynamic(
  () => import("@/components/gmao/premium/delete-confirm-dialog").then((m) => ({ default: m.DeleteConfirmDialog })),
  { ssr: false },
);

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tous" },
  ...Object.values(MaintenanceOrderStatus).map((s) => ({
    value: s,
    label: maintenanceOrderStatusFr(s),
  })),
];

export function MaintenanceOrdersModuleClient({
  orders: initialRows,
  initialFilters,
  pagination,
  machines,
  readOnly = false,
}: {
  orders: MaintenanceOrderRow[];
  initialFilters: { q: string; status: string; machineId: string; dateFrom: string; dateTo: string; page: number; pageSize: number };
  pagination: { page: number; pageCount: number; total: number; pageSize: number };
  machines: MachineOption[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [rows, setRows] = React.useState(initialRows);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [viewOrderId, setViewOrderId] = React.useState<string | null>(null);
  const [editOrder, setEditOrder] = React.useState<MaintenanceOrderRow | null>(null);
  const [deleteOrder, setDeleteOrder] = React.useState<MaintenanceOrderRow | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);
  const [bulkEditOpen, setBulkEditOpen] = React.useState(false);
  const [bulkEditPending, setBulkEditPending] = React.useState(false);
  const [reopenPending, setReopenPending] = React.useState(false);
  const bulkOverlayRef = React.useRef<Map<string, MaintenanceOrderRow> | null>(null);
  const [, startFilterTransition] = React.useTransition();

  const filterSearch = React.useMemo(() => {
    const params = new URLSearchParams();
    if (initialFilters.q) params.set("q", initialFilters.q);
    if (initialFilters.status !== "ALL") params.set("status", initialFilters.status);
    if (initialFilters.machineId && initialFilters.machineId !== "ALL") params.set("machineId", initialFilters.machineId);
    if (initialFilters.dateFrom) params.set("dateFrom", initialFilters.dateFrom);
    if (initialFilters.dateTo) params.set("dateTo", initialFilters.dateTo);
    if (initialFilters.page > 1) params.set("page", String(initialFilters.page));
    const size = pageSizeQueryValue(initialFilters.pageSize);
    if (size) params.set("pageSize", size);
    return params.toString();
  }, [initialFilters]);

  const pushFilters = React.useCallback(
    (next: {
      q?: string;
      status?: string;
      machineId?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      pageSize?: number;
    }) => {
      const params = new URLSearchParams();
      const q = next.q ?? initialFilters.q;
      const status = next.status ?? initialFilters.status;
      const machineId = next.machineId ?? initialFilters.machineId;
      const dateFrom = next.dateFrom ?? initialFilters.dateFrom;
      const dateTo = next.dateTo ?? initialFilters.dateTo;
      const page = next.page ?? 1;
      const pageSize = next.pageSize ?? initialFilters.pageSize;
      if (q) params.set("q", q);
      if (status !== "ALL") params.set("status", status);
      if (machineId && machineId !== "ALL") params.set("machineId", machineId);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (page > 1) params.set("page", String(page));
      const size = pageSizeQueryValue(pageSize);
      if (size) params.set("pageSize", size);
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [initialFilters, pathname, router],
  );

  const handleDebouncedSearch = React.useCallback(
    (value: string) => {
      startFilterTransition(() => pushFilters({ q: value.trim() }));
    },
    [pushFilters],
  );

  const openDetailById = React.useCallback((id: string) => {
    setViewOrderId(id);
  }, []);

  useDetailQueryParam(openDetailById);

  React.useEffect(() => {
    const overlay = bulkOverlayRef.current;
    if (overlay && overlay.size > 0) {
      const caughtUp = Array.from(overlay.entries()).every(([id, local]) => {
        const server = initialRows.find((row) => row.id === id);
        return (
          !server ||
          (server.status === local.status &&
            server.observationComment === local.observationComment &&
            server.managerApproval === local.managerApproval)
        );
      });
      if (caughtUp) {
        bulkOverlayRef.current = null;
        setRows(initialRows);
      } else {
        setRows(initialRows.map((row) => overlay.get(row.id) ?? row));
      }
      return;
    }
    setRows(initialRows);
  }, [initialRows]);

  const viewOrder = React.useMemo(
    () => (viewOrderId ? rows.find((o) => o.id === viewOrderId) ?? null : null),
    [rows, viewOrderId],
  );

  const machineOptions = React.useMemo(
    () => [{ value: "ALL", label: "Toutes les machines" }, ...machines.map((m) => ({ value: m.id, label: m.name }))],
    [machines],
  );

  const filters = React.useMemo(
    () => [
      {
        id: "machine",
        label: "Machines",
        value: initialFilters.machineId,
        onChange: (v: string) => startFilterTransition(() => pushFilters({ machineId: v })),
        options: machineOptions,
      },
      {
        id: "status",
        label: "Statut",
        value: initialFilters.status,
        onChange: (v: string) => startFilterTransition(() => pushFilters({ status: v })),
        options: STATUS_OPTIONS,
      },
    ],
    [initialFilters.machineId, initialFilters.status, machineOptions, pushFilters],
  );

  const handleDeleted = React.useCallback((id: string) => {
    setRows((prev) => prev.filter((o) => o.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setViewOrderId((prev) => (prev === id ? null : prev));
  }, []);

  const handleBulkDeleted = React.useCallback((ids: string[]) => {
    const removed = new Set(ids);
    setRows((prev) => prev.filter((o) => !removed.has(o.id)));
    setSelectedIds(new Set());
    setViewOrderId((prev) => (prev && removed.has(prev) ? null : prev));
  }, []);

  const applyReopened = React.useCallback(
    (ids: string[]) => {
      const reopened = new Set(ids);
      setRows((prev) =>
        prev
          .map((o) => (reopened.has(o.id) ? { ...o, status: MaintenanceOrderStatus.ACTIVE } : o))
          .filter((o) => initialFilters.status === "ALL" || o.status === initialFilters.status),
      );
      router.refresh();
    },
    [initialFilters.status, router],
  );

  const handleReopen = React.useCallback(
    async (order: MaintenanceOrderRow) => {
      if (reopenPending || order.status === MaintenanceOrderStatus.ACTIVE) return;
      setReopenPending(true);
      const res = await reopenMaintenanceOrderAction(order.id);
      setReopenPending(false);
      if (!res.ok) {
        window.alert(res.error);
        return;
      }
      applyReopened([order.id]);
    },
    [applyReopened, reopenPending],
  );

  const handleBulkReopen = React.useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || reopenPending) return;
    setReopenPending(true);
    const res = await reopenMaintenanceOrdersBulkAction(ids);
    setReopenPending(false);
    if (!res.ok) {
      window.alert(res.error);
      return;
    }
    applyReopened(res.ids);
    setSelectedIds(new Set());
  }, [applyReopened, reopenPending, selectedIds]);

  const bulkFields = React.useMemo<BulkEditField[]>(
    () => [
      {
        id: "status",
        label: "Statut",
        kind: "select",
        options: Object.values(MaintenanceOrderStatus).map((status) => ({
          value: status,
          label: maintenanceOrderStatusFr(status),
        })),
      },
      {
        id: "observationComment",
        label: "Observation",
        kind: "text",
        placeholder: "Commentaire d'observation",
      },
      {
        id: "managerApproval",
        label: "Visa responsable",
        kind: "text",
        placeholder: "Visa / validation",
      },
    ],
    [],
  );

  const handleBulkEdit = React.useCallback(
    async (field: string, value: string): Promise<{ ok: true } | { ok: false; error: string }> => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return { ok: false, error: "Cochez au moins une ligne dans le tableau." };
      if (bulkEditPending) return { ok: false, error: "Une mise à jour est déjà en cours." };
      const previous = rows;
      setRows((prev) =>
        prev.map((row) => {
          if (!selectedIds.has(row.id)) return row;
          if (field === "status") return { ...row, status: value as MaintenanceOrderStatus };
          if (field === "observationComment") return { ...row, observationComment: value.trim() || null };
          if (field === "managerApproval") return { ...row, managerApproval: value.trim() || null };
          return row;
        }),
      );
      setBulkEditPending(true);
      try {
        const res = await bulkUpdateMaintenanceOrdersAction({ ids, field, value });
        if (!res.ok) {
          setRows(previous);
          return { ok: false, error: res.error };
        }
        const byId = new Map(res.items.map((item) => [item.id, item]));
        bulkOverlayRef.current = byId;
        setRows((prev) => prev.map((row) => byId.get(row.id) ?? row));
        setBulkEditOpen(false);
        setSelectedIds(new Set());
        router.refresh();
        return { ok: true };
      } catch (error) {
        setRows(previous);
        return { ok: false, error: error instanceof Error ? error.message : "Mise à jour groupée impossible." };
      } finally {
        setBulkEditPending(false);
      }
    },
    [bulkEditPending, rows, selectedIds, router],
  );

  return (
    <GmaoModuleShell>
      <ModuleFilterBar
        layout="inline"
        onDebouncedSearchChange={handleDebouncedSearch}
        searchLabel="Référence"
        searchInputId="om-reference-search"
        searchPlaceholder="Référence ou ID de l'ordre…"
        searchInitialValue={initialFilters.q}
        resultCount={pagination.total}
        action={
          readOnly ? undefined : (
            <div className="flex shrink-0 flex-nowrap items-center gap-2">
              <CloseOrdersPeriodDialog />
              <AddMaintenanceOrderSheet
                machines={machines}
                onCreated={(created) => {
                  setRows((prev) => [created, ...prev]);
                }}
              />
            </div>
          )
        }
        filters={filters}
        extras={
          <>
            <div className="w-[10.25rem] min-w-[10.25rem] shrink-0">
              <Label htmlFor="om-date-from" className="text-[11px] font-medium text-slate-700">
                Date du
              </Label>
              <Input
                id="om-date-from"
                type="date"
                value={initialFilters.dateFrom}
                onChange={(e) => startFilterTransition(() => pushFilters({ dateFrom: e.target.value }))}
                className="mt-0.5 h-9 border-slate-200 bg-white"
              />
            </div>
            <div className="w-[10.25rem] min-w-[10.25rem] shrink-0">
              <Label htmlFor="om-date-to" className="text-[11px] font-medium text-slate-700">
                Date au
              </Label>
              <Input
                id="om-date-to"
                type="date"
                value={initialFilters.dateTo}
                onChange={(e) => startFilterTransition(() => pushFilters({ dateTo: e.target.value }))}
                className="mt-0.5 h-9 border-slate-200 bg-white"
              />
            </div>
          </>
        }
      />

      <MaintenanceOrdersDataTable
        orders={rows}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onView={(order) => setViewOrderId(order.id)}
        onEdit={readOnly ? () => {} : setEditOrder}
        onDelete={readOnly ? () => {} : setDeleteOrder}
        onReopen={readOnly ? undefined : handleReopen}
        onBulkReopen={readOnly ? undefined : handleBulkReopen}
        reopenPending={reopenPending}
        onBulkDelete={readOnly ? () => {} : () => setBulkDeleteOpen(true)}
        onBulkEdit={readOnly ? undefined : () => setBulkEditOpen(true)}
        readOnly={readOnly}
        pagination={pagination}
        previousHref={hrefWithPage(pathname, filterSearch, Math.max(1, pagination.page - 1))}
        nextHref={hrefWithPage(pathname, filterSearch, pagination.page + 1)}
      />

      <MaintenanceOrderDetailSheet
        orderId={viewOrderId}
        orderReference={viewOrder?.reference ?? ""}
        orderStatus={viewOrder?.status}
        canReopen={!readOnly && viewOrder?.status !== MaintenanceOrderStatus.ACTIVE}
        reopenPending={reopenPending}
        onReopen={
          viewOrder && !readOnly
            ? () => handleReopen(viewOrder)
            : undefined
        }
        open={Boolean(viewOrderId)}
        onOpenChange={(open) => {
          if (!open) setViewOrderId(null);
        }}
      />

      {!readOnly ? (
        <>
          <BulkEditDialog
            open={bulkEditOpen}
            onOpenChange={setBulkEditOpen}
            selectedCount={selectedIds.size}
            fields={bulkFields}
            pending={bulkEditPending}
            onApply={handleBulkEdit}
          />

          <MaintenanceOrderEditDialog
            order={editOrder}
            machines={machines}
            open={Boolean(editOrder)}
            onOpenChange={(open) => {
              if (!open) setEditOrder(null);
            }}
            onUpdated={(updated) => {
              setRows((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
              if (viewOrderId === updated.id) setViewOrderId(updated.id);
            }}
          />

          <DeleteConfirmDialog
            open={Boolean(deleteOrder)}
            onOpenChange={(open) => {
              if (!open) setDeleteOrder(null);
            }}
            title="Confirmer la suppression"
            description={
              deleteOrder
                ? `Supprimer l'ordre « ${deleteOrder.reference} » ? Cette action est irréversible.`
                : ""
            }
            onConfirm={async () => {
              if (!deleteOrder) return { ok: false, error: "Ordre introuvable." };
              const res = await deleteMaintenanceOrderAction(deleteOrder.id);
              return { ok: res.ok, error: res.ok ? undefined : res.error };
            }}
            onSuccess={() => {
              if (deleteOrder) handleDeleted(deleteOrder.id);
            }}
          />

          <DeleteConfirmDialog
            open={bulkDeleteOpen}
            onOpenChange={setBulkDeleteOpen}
            title="Supprimer la sélection ?"
            description={`${selectedIds.size} ordre(s) seront définitivement supprimés.`}
            onConfirm={async () => {
              const res = await deleteMaintenanceOrdersBulkAction(Array.from(selectedIds));
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
