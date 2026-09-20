"use client";

import dynamic from "next/dynamic";
import { ArrowDownLeft, Package } from "lucide-react";
import * as React from "react";

import { deletePartAction, deletePartsBulkAction } from "@/app/actions/part";
import { GmaoModuleShell } from "@/components/gmao/premium/module-shell";
import { ModuleFilterBar } from "@/components/gmao/premium/module-filter-bar";
import { StockExportButtons } from "@/components/stock/stock-export-buttons";
import { StockInventoryGrid } from "@/components/stock/stock-inventory-grid";
import { StockMovementsTable } from "@/components/stock/stock-movements-table";
import type { StockMovementRow } from "@/lib/gmao/stock-movements-query";
import type { MachineOption, PartInventoryRow } from "@/lib/gmao/stock-parts-query";
import { useDetailQueryParam } from "@/lib/navigation/use-detail-query-param";
import { fuzzyMatch } from "@/lib/utils/fuzzy";
import { cn } from "@/lib/utils";

const AddPartSheet = dynamic(
  () => import("@/components/stock/add-part-sheet").then((m) => ({ default: m.AddPartSheet })),
  { ssr: false },
);
const PartEditDialog = dynamic(
  () => import("@/components/stock/part-edit-dialog").then((m) => ({ default: m.PartEditDialog })),
  { ssr: false },
);
const StockAdjustDialog = dynamic(
  () => import("@/components/stock/stock-adjust-dialog").then((m) => ({ default: m.StockAdjustDialog })),
  { ssr: false },
);
const DeleteConfirmDialog = dynamic(
  () => import("@/components/gmao/premium/delete-confirm-dialog").then((m) => ({ default: m.DeleteConfirmDialog })),
  { ssr: false },
);

type PartSearchRow = PartInventoryRow & { searchBlob: string };
type MovementSearchRow = StockMovementRow & { searchBlob: string };
type StockTab = "inventory" | "movements";
type AlertFilter = "ALL" | "LOW";

const ALERT_OPTIONS = [
  { value: "ALL", label: "Toutes les pièces" },
  { value: "LOW", label: "Rupture / Alerte uniquement" },
];

function buildPartSearchRows(parts: PartInventoryRow[]): PartSearchRow[] {
  return parts.map((p) => ({
    ...p,
    searchBlob: `${p.id} ${p.designation} ${p.brand ?? ""} ${p.reference ?? ""} ${p.machines.map((m) => m.name).join(" ")}`,
  }));
}

function buildMovementSearchRows(movements: StockMovementRow[]): MovementSearchRow[] {
  return movements.map((m) => ({
    ...m,
    searchBlob: `${m.id} ${m.partDesignation} ${m.partBrand ?? ""} ${m.partReference ?? ""} ${m.motif ?? ""} ${m.type}`,
  }));
}

type StockModuleClientProps = {
  parts: PartInventoryRow[];
  movements: StockMovementRow[];
  machines: MachineOption[];
};

export function StockModuleClient({ parts: initialParts, movements: initialMovements, machines }: StockModuleClientProps) {
  const [activeTab, setActiveTab] = React.useState<StockTab>("inventory");
  const [parts, setParts] = React.useState(initialParts);
  const [movements, setMovements] = React.useState(initialMovements);
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const [machineFilter, setMachineFilter] = React.useState("ALL");
  const [alertFilter, setAlertFilter] = React.useState<AlertFilter>("ALL");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [editPart, setEditPart] = React.useState<PartInventoryRow | null>(null);
  const [deletePart, setDeletePart] = React.useState<PartInventoryRow | null>(null);
  const [adjustPart, setAdjustPart] = React.useState<PartInventoryRow | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);
  const [, startFilterTransition] = React.useTransition();

  const handleDebouncedSearch = React.useCallback((value: string) => {
    setDebouncedQ(value);
  }, []);

  const openDetailById = React.useCallback(
    (id: string) => {
      const found = parts.find((p) => p.id === id);
      if (found) {
        setActiveTab("inventory");
        setEditPart(found);
      }
    },
    [parts],
  );

  useDetailQueryParam(openDetailById);

  React.useEffect(() => {
    setParts(initialParts);
  }, [initialParts]);

  React.useEffect(() => {
    setMovements(initialMovements);
  }, [initialMovements]);

  const partSearchRows = React.useMemo(() => buildPartSearchRows(parts), [parts]);
  const movementSearchRows = React.useMemo(() => buildMovementSearchRows(movements), [movements]);

  const filteredParts = React.useMemo(() => {
    const needle = debouncedQ.trim();
    return partSearchRows.filter((p) => {
      if (machineFilter !== "ALL" && !p.machines.some((m) => m.id === machineFilter)) return false;
      if (alertFilter === "LOW" && !p.isLowStock) return false;
      if (!needle) return true;
      return fuzzyMatch(needle, p.searchBlob);
    });
  }, [alertFilter, debouncedQ, machineFilter, partSearchRows]);

  const filteredMovements = React.useMemo(() => {
    const needle = debouncedQ.trim();
    return movementSearchRows.filter((m) => {
      if (!needle) return true;
      return fuzzyMatch(needle, m.searchBlob);
    });
  }, [debouncedQ, movementSearchRows]);

  React.useEffect(() => {
    const visible = new Set(filteredParts.map((p) => p.id));
    setSelectedIds((prev) => {
      const next = new Set(Array.from(prev).filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [filteredParts]);

  const machineOptions = React.useMemo(
    () => [{ value: "ALL", label: "Toutes les machines" }, ...machines.map((m) => ({ value: m.id, label: m.name }))],
    [machines],
  );

  const inventoryFilters = React.useMemo(
    () => [
      {
        id: "machine",
        label: "Machine",
        value: machineFilter,
        onChange: (v: string) => startFilterTransition(() => setMachineFilter(v)),
        options: machineOptions,
      },
      {
        id: "alert",
        label: "Stock",
        value: alertFilter,
        onChange: (v: string) => startFilterTransition(() => setAlertFilter(v as AlertFilter)),
        options: ALERT_OPTIONS,
      },
    ],
    [alertFilter, machineFilter, machineOptions],
  );

  const handleDeleted = React.useCallback((id: string) => {
    setParts((prev) => prev.filter((p) => p.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleBulkDeleted = React.useCallback((ids: string[]) => {
    const removed = new Set(ids);
    setParts((prev) => prev.filter((p) => !removed.has(p.id)));
    setSelectedIds(new Set());
  }, []);

  const handleAdjusted = React.useCallback((partId: string, newQuantity: number) => {
    setParts((prev) =>
      prev.map((p) =>
        p.id === partId ? { ...p, quantity: newQuantity, isLowStock: newQuantity <= p.minStock } : p,
      ),
    );
  }, []);

  const resultCount = activeTab === "inventory" ? filteredParts.length : filteredMovements.length;

  return (
    <GmaoModuleShell>
      <div className="flex flex-wrap items-center gap-2" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "inventory"}
          onClick={() => {
            setActiveTab("inventory");
            setMachineFilter("ALL");
            setAlertFilter("ALL");
          }}
          className={cn(
            "flex flex-row items-center gap-x-2 rounded-xl border px-3 py-2 text-sm font-medium transition",
            activeTab === "inventory"
              ? "border-[#1F76FB]/30 bg-[#E8F1FF] text-[#0B2A5B]"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-[#0B2A5B]",
          )}
        >
          <Package className="h-5 w-5 shrink-0 text-[#1F76FB]" strokeWidth={1.75} />
          Inventaire des Pièces
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "movements"}
          onClick={() => {
            setActiveTab("movements");
            setMachineFilter("ALL");
            setAlertFilter("ALL");
          }}
          className={cn(
            "flex flex-row items-center gap-x-2 rounded-xl border px-3 py-2 text-sm font-medium transition",
            activeTab === "movements"
              ? "border-[#1F76FB]/30 bg-[#E8F1FF] text-[#0B2A5B]"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-[#0B2A5B]",
          )}
        >
          <ArrowDownLeft className="h-5 w-5 shrink-0 text-[#1F76FB]" strokeWidth={1.75} />
          Suivi des Mouvements de Stock
        </button>
      </div>

      <ModuleFilterBar
        layout="inline"
        onDebouncedSearchChange={handleDebouncedSearch}
        searchResetKey={activeTab}
        searchPlaceholder={
          activeTab === "inventory"
            ? "Recherche : désignation, marque, référence…"
            : "Recherche : pièce, motif, type…"
        }
        resultCount={resultCount}
        action={
          activeTab === "inventory" ? (
            <AddPartSheet
              machines={machines}
              onCreated={(created) => {
                setParts((prev) => [...prev, created].sort((a, b) => a.designation.localeCompare(b.designation, "fr")));
              }}
            />
          ) : null
        }
        exportActions={
          <StockExportButtons activeTab={activeTab} inventory={filteredParts} movements={filteredMovements} />
        }
        filters={activeTab === "inventory" ? inventoryFilters : []}
      />

      {activeTab === "inventory" ? (
        <StockInventoryGrid
          parts={filteredParts}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
          onEdit={setEditPart}
          onDelete={setDeletePart}
          onAdjust={setAdjustPart}
          onBulkDelete={() => setBulkDeleteOpen(true)}
        />
      ) : (
        <StockMovementsTable movements={filteredMovements} />
      )}

      <PartEditDialog
        part={editPart}
        machines={machines}
        open={Boolean(editPart)}
        onOpenChange={(open) => {
          if (!open) setEditPart(null);
        }}
        onUpdated={(updated) => {
          setParts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        }}
      />

      <StockAdjustDialog
        part={adjustPart}
        open={Boolean(adjustPart)}
        onOpenChange={(open) => {
          if (!open) setAdjustPart(null);
        }}
        onAdjusted={handleAdjusted}
      />

      <DeleteConfirmDialog
        open={Boolean(deletePart)}
        onOpenChange={(open) => {
          if (!open) setDeletePart(null);
        }}
        title="Supprimer la pièce ?"
        description={
          deletePart
            ? `La pièce « ${deletePart.designation} » sera retirée du catalogue. Impossible si elle est liée à une intervention.`
            : ""
        }
        onConfirm={async () => {
          if (!deletePart) return { ok: false, error: "Pièce introuvable." };
          const res = await deletePartAction(deletePart.id);
          return { ok: res.ok, error: res.ok ? undefined : res.error };
        }}
        onSuccess={() => {
          if (deletePart) handleDeleted(deletePart.id);
        }}
      />

      <DeleteConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Supprimer la sélection ?"
        description={`${selectedIds.size} pièce(s) seront définitivement supprimées.`}
        onConfirm={async () => {
          const res = await deletePartsBulkAction(Array.from(selectedIds));
          if (!res.ok) return { ok: false, error: res.error };
          handleBulkDeleted(res.ids);
          return { ok: true };
        }}
      />
    </GmaoModuleShell>
  );
}
