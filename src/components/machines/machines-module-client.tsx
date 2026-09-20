"use client";

import { MachineAssetStatus, MaintenanceFrequency } from "@prisma/client";
import dynamic from "next/dynamic";
import * as React from "react";

import { deleteMachineAction, deleteMachinesBulkAction } from "@/app/actions/machine";
import { GmaoModuleShell } from "@/components/gmao/premium/module-shell";
import { ModuleFilterBar } from "@/components/gmao/premium/module-filter-bar";
import type { MachineCardVm } from "@/components/machines/machine-card";
import { MachinesDataTable } from "@/components/machines/machines-data-table";
import { MachinesExportButtons } from "@/components/machines/machines-export-buttons";
import { machineImageApiUrl } from "@/lib/media/image-api";
import { useDetailQueryParam } from "@/lib/navigation/use-detail-query-param";
import { maintenanceFrequencyFr } from "@/lib/view/gmao-labels";
import { fuzzyMatch } from "@/lib/utils/fuzzy";

const MachineFormSheet = dynamic(
  () => import("@/components/machines/machine-form-sheet").then((m) => ({ default: m.MachineFormSheet })),
  { ssr: false },
);
const MachineDetailSheet = dynamic(
  () => import("@/components/machines/machine-detail-sheet").then((m) => ({ default: m.MachineDetailSheet })),
  { ssr: false },
);
const MachineEditDialog = dynamic(
  () => import("@/components/machines/machine-edit-dialog").then((m) => ({ default: m.MachineEditDialog })),
  { ssr: false },
);
const DeleteConfirmDialog = dynamic(
  () => import("@/components/gmao/premium/delete-confirm-dialog").then((m) => ({ default: m.DeleteConfirmDialog })),
  { ssr: false },
);

type StatusFilter = "ALL" | MachineAssetStatus;
type SectorFilter = "ALL" | MaintenanceFrequency;
type MachineSearchRow = MachineCardVm & { searchBlob: string };

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tous" },
  { value: MachineAssetStatus.OPERATIONAL, label: "Opérationnel" },
  { value: MachineAssetStatus.UNDER_MAINTENANCE, label: "En maintenance" },
  { value: MachineAssetStatus.DOWN, label: "En panne" },
] as const;

const SECTOR_OPTIONS = [
  { value: "ALL", label: "Toutes" },
  ...Object.values(MaintenanceFrequency).map((f) => ({
    value: f,
    label: maintenanceFrequencyFr(f),
  })),
];

function buildSearchRows(machines: MachineCardVm[]): MachineSearchRow[] {
  return machines.map((m) => ({
    ...m,
    searchBlob: `${m.id} ${m.name} ${m.location} ${maintenanceFrequencyFr(m.maintenanceSector)} ${m.legacyMatricule ?? ""}`,
  }));
}

export function MachinesModuleClient({
  machines: initialMachines,
}: {
  machines: MachineCardVm[];
}) {
  const [rows, setRows] = React.useState(initialMachines);
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const [equipmentId, setEquipmentId] = React.useState("ALL");
  const [status, setStatus] = React.useState<StatusFilter>("ALL");
  const [location, setLocation] = React.useState("ALL");
  const [sector, setSector] = React.useState<SectorFilter>("ALL");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [detailMachine, setDetailMachine] = React.useState<MachineCardVm | null>(null);
  const [editMachine, setEditMachine] = React.useState<MachineCardVm | null>(null);
  const [deleteMachine, setDeleteMachine] = React.useState<MachineCardVm | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);
  const [, startFilterTransition] = React.useTransition();

  const handleDebouncedSearch = React.useCallback((value: string) => {
    setDebouncedQ(value);
  }, []);

  const openDetailById = React.useCallback(
    (id: string) => {
      const found = rows.find((m) => m.id === id);
      if (found) setDetailMachine(found);
    },
    [rows],
  );

  useDetailQueryParam(openDetailById);

  React.useEffect(() => {
    setRows(initialMachines);
  }, [initialMachines]);

  const searchRows = React.useMemo(() => buildSearchRows(rows), [rows]);

  const locations = React.useMemo(() => {
    const set = new Set(rows.map((m) => m.location.trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [rows]);

  const locationOptions = React.useMemo(
    () => [{ value: "ALL", label: "Tous" }, ...locations.map((l) => ({ value: l, label: l }))],
    [locations],
  );

  const filtered = React.useMemo(() => {
    const needle = debouncedQ.trim();
    return searchRows.filter((m) => {
      if (equipmentId !== "ALL" && m.id !== equipmentId) return false;
      if (status !== "ALL" && m.assetStatus !== status) return false;
      if (location !== "ALL" && m.location !== location) return false;
      if (sector !== "ALL" && m.maintenanceSector !== sector) return false;
      if (!needle) return true;
      return fuzzyMatch(needle, m.searchBlob);
    });
  }, [searchRows, debouncedQ, equipmentId, status, location, sector]);

  React.useEffect(() => {
    const visible = new Set(filtered.map((m) => m.id));
    setSelectedIds((prev) => {
      const next = new Set(Array.from(prev).filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [filtered]);

  const onEquipmentChange = React.useCallback((v: string) => {
    startFilterTransition(() => setEquipmentId(v));
  }, []);

  const onStatusChange = React.useCallback((v: string) => {
    startFilterTransition(() => setStatus(v as StatusFilter));
  }, []);

  const onLocationChange = React.useCallback((v: string) => {
    startFilterTransition(() => setLocation(v));
  }, []);

  const onSectorChange = React.useCallback((v: string) => {
    startFilterTransition(() => setSector(v as SectorFilter));
  }, []);

  const equipmentOptions = React.useMemo(
    () => [
      { value: "ALL", label: "Tous les équipements" },
      ...rows.map((m) => ({
        value: m.id,
        label: m.legacyMatricule != null ? `${m.name} (M${m.legacyMatricule})` : m.name,
      })),
    ],
    [rows],
  );

  const filters = React.useMemo(
    () => [
      { id: "equipment", label: "Machine", value: equipmentId, onChange: onEquipmentChange, options: equipmentOptions },
      { id: "status", label: "Statut", value: status, onChange: onStatusChange, options: [...STATUS_OPTIONS] },
      { id: "location", label: "Emplacement", value: location, onChange: onLocationChange, options: locationOptions },
      { id: "sector", label: "Fréquence", value: sector, onChange: onSectorChange, options: SECTOR_OPTIONS },
    ],
    [equipmentId, status, location, sector, equipmentOptions, locationOptions, onEquipmentChange, onStatusChange, onLocationChange, onSectorChange],
  );

  const handleUpdated = React.useCallback((updated: MachineCardVm) => {
    setRows((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    setDetailMachine((prev) => (prev?.id === updated.id ? updated : prev));
  }, []);

  const handleDeleted = React.useCallback((id: string) => {
    setRows((prev) => prev.filter((m) => m.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setDetailMachine((prev) => (prev?.id === id ? null : prev));
  }, []);

  const handleBulkDeleted = React.useCallback((ids: string[]) => {
    const removed = new Set(ids);
    setRows((prev) => prev.filter((m) => !removed.has(m.id)));
    setSelectedIds(new Set());
  }, []);

  return (
    <GmaoModuleShell>
      <ModuleFilterBar
        layout="inline"
        onDebouncedSearchChange={handleDebouncedSearch}
        searchLabel="Équipement"
        searchInputId="machines-equipment-search"
        searchPlaceholder="Nom, matricule ou ID…"
        resultCount={filtered.length}
        action={
          <MachineFormSheet
            onCreated={(created) => {
              setRows((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name, "fr")));
            }}
          />
        }
        exportActions={<MachinesExportButtons machines={filtered} />}
        filters={filters}
      />

      <MachinesDataTable
        machines={filtered}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onEdit={setEditMachine}
        onDelete={setDeleteMachine}
        onBulkDelete={() => setBulkDeleteOpen(true)}
      />

      <MachineEditDialog
        machine={editMachine}
        open={Boolean(editMachine)}
        onOpenChange={(open) => {
          if (!open) setEditMachine(null);
        }}
        onUpdated={handleUpdated}
      />

      <DeleteConfirmDialog
        open={Boolean(deleteMachine)}
        onOpenChange={(open) => {
          if (!open) setDeleteMachine(null);
        }}
        title="Confirmer la suppression"
        description={
          deleteMachine
            ? `Êtes-vous sûr de vouloir supprimer la machine « ${deleteMachine.name} » ? Cette action est irréversible.`
            : ""
        }
        onConfirm={async () => {
          if (!deleteMachine) return { ok: false, error: "Machine introuvable." };
          const res = await deleteMachineAction(deleteMachine.id);
          return { ok: res.ok, error: res.ok ? undefined : res.error };
        }}
        onSuccess={() => {
          if (deleteMachine) handleDeleted(deleteMachine.id);
        }}
      />

      <DeleteConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Supprimer la sélection ?"
        description={`${selectedIds.size} machine(s) seront définitivement supprimées. Cette action est irréversible.`}
        onConfirm={async () => {
          const res = await deleteMachinesBulkAction(Array.from(selectedIds));
          if (!res.ok) return { ok: false, error: res.error };
          handleBulkDeleted(res.ids);
          return { ok: true };
        }}
      />

      <MachineDetailSheet
        machineId={detailMachine?.id ?? null}
        machineName={detailMachine?.name ?? ""}
        imageUrl={detailMachine?.hasCoverImage ? machineImageApiUrl(detailMachine.id) : null}
        qrCode={detailMachine?.qrCode ?? null}
        open={Boolean(detailMachine)}
        onOpenChange={(open) => {
          if (!open) setDetailMachine(null);
        }}
      />
    </GmaoModuleShell>
  );
}
