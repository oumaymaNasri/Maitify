"use client";

import { InterventionType, MaintenanceOrderStatus } from "@prisma/client";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

import { deleteMaintenanceOrderAction, deleteMaintenanceOrdersBulkAction } from "@/app/actions/maintenance-order";
import { GmaoModuleShell } from "@/components/gmao/premium/module-shell";
import { ModuleFilterBar } from "@/components/gmao/premium/module-filter-bar";
import type { MachineOption } from "@/components/maintenance-orders/add-maintenance-order-sheet";
import { MaintenanceOrdersDataTable } from "@/components/maintenance-orders/maintenance-orders-data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MaintenanceOrderRow } from "@/lib/gmao/maintenance-orders-query";
import { useDetailQueryParam } from "@/lib/navigation/use-detail-query-param";
import { maintenanceOrderStatusFr } from "@/lib/view/gmao-labels";
import { interventionTypeFr } from "@/lib/view/labels";

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

type StatusFilter = "ALL" | MaintenanceOrderStatus;
type TypeFilter = "ALL" | InterventionType;

type OrdersPagination = {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
};

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tous" },
  ...Object.values(MaintenanceOrderStatus).map((s) => ({
    value: s,
    label: maintenanceOrderStatusFr(s),
  })),
];

const TYPE_OPTIONS = [
  { value: "ALL", label: "Tous" },
  ...Object.values(InterventionType).map((t) => ({
    value: t,
    label: interventionTypeFr(t),
  })),
];

export function MaintenanceOrdersModuleClient({
  orders: initialRows,
  pagination,
  initialFilters,
  machines,
  readOnly = false,
}: {
  orders: MaintenanceOrderRow[];
  pagination: OrdersPagination;
  initialFilters: { q: string; status: string; type: string; machineId: string; dateFrom: string; dateTo: string };
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
  const [, startFilterTransition] = React.useTransition();

  const pushFilters = React.useCallback(
    (next: {
      q?: string;
      status?: string;
      type?: string;
      machineId?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
    }) => {
      const params = new URLSearchParams();
      const q = next.q ?? initialFilters.q;
      const status = next.status ?? initialFilters.status;
      const type = next.type ?? initialFilters.type;
      const machineId = next.machineId ?? initialFilters.machineId;
      const dateFrom = next.dateFrom ?? initialFilters.dateFrom;
      const dateTo = next.dateTo ?? initialFilters.dateTo;
      const page = next.page ?? 1;
      if (q) params.set("q", q);
      if (status !== "ALL") params.set("status", status);
      if (type !== "ALL") params.set("type", type);
      if (machineId && machineId !== "ALL") params.set("machineId", machineId);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (page > 1) params.set("page", String(page));
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [initialFilters, pathname, router],
  );

  const handleDebouncedSearch = React.useCallback(
    (value: string) => {
      startFilterTransition(() => pushFilters({ q: value.trim(), page: 1 }));
    },
    [pushFilters],
  );

  const openDetailById = React.useCallback((id: string) => {
    setViewOrderId(id);
  }, []);

  useDetailQueryParam(openDetailById);

  React.useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const viewOrder = React.useMemo(
    () => (viewOrderId ? rows.find((o) => o.id === viewOrderId) ?? null : null),
    [rows, viewOrderId],
  );

  const goToPage = React.useCallback(
    (nextPage: number) => {
      const safe = Math.max(1, Math.min(nextPage, pagination.pageCount));
      if (safe === pagination.page) return;
      pushFilters({ page: safe });
    },
    [pagination.page, pagination.pageCount, pushFilters],
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
        onChange: (v: string) => startFilterTransition(() => pushFilters({ machineId: v, page: 1 })),
        options: machineOptions,
      },
      {
        id: "status",
        label: "Statut",
        value: initialFilters.status,
        onChange: (v: string) => startFilterTransition(() => pushFilters({ status: v, page: 1 })),
        options: STATUS_OPTIONS,
      },
      {
        id: "type",
        label: "Type",
        value: initialFilters.type,
        onChange: (v: string) => startFilterTransition(() => pushFilters({ type: v, page: 1 })),
        options: TYPE_OPTIONS,
      },
    ],
    [initialFilters.machineId, initialFilters.status, initialFilters.type, machineOptions, pushFilters],
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
            <AddMaintenanceOrderSheet
              machines={machines}
              onCreated={(created) => {
                setRows((prev) => [created, ...prev]);
              }}
            />
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
                onChange={(e) => startFilterTransition(() => pushFilters({ dateFrom: e.target.value, page: 1 }))}
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
                onChange={(e) => startFilterTransition(() => pushFilters({ dateTo: e.target.value, page: 1 }))}
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

      <MaintenanceOrderDetailSheet
        orderId={viewOrderId}
        orderReference={viewOrder?.reference ?? ""}
        open={Boolean(viewOrderId)}
        onOpenChange={(open) => {
          if (!open) setViewOrderId(null);
        }}
      />

      {!readOnly ? (
        <>
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
