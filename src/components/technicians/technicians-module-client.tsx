"use client";

import { TechnicianAvailability } from "@prisma/client";
import dynamic from "next/dynamic";
import * as React from "react";

import { deleteTechnicianAction, deleteTechniciansBulkAction } from "@/app/actions/technician";
import { GmaoModuleShell } from "@/components/gmao/premium/module-shell";
import { ModuleFilterBar } from "@/components/gmao/premium/module-filter-bar";
import { TechniciansDataTable } from "@/components/technicians/technicians-data-table";
import { TechniciansExportButtons } from "@/components/technicians/technicians-export-buttons";
import type { TechnicianRow } from "@/lib/gmao/technicians-query";
import { technicianAvailabilityFr, technicianRoleFr, technicianSpecialtyFr } from "@/lib/view/gmao-labels";
import { fuzzyMatch } from "@/lib/utils/fuzzy";

const AddTechnicianSheet = dynamic(
  () => import("@/components/technicians/add-technician-sheet").then((m) => ({ default: m.AddTechnicianSheet })),
  { ssr: false },
);
const TechnicianDetailSheet = dynamic(
  () => import("@/components/technicians/technician-detail-sheet").then((m) => ({ default: m.TechnicianDetailSheet })),
  { ssr: false },
);
const TechnicianEditDialog = dynamic(
  () => import("@/components/technicians/technician-edit-dialog").then((m) => ({ default: m.TechnicianEditDialog })),
  { ssr: false },
);
const DeleteConfirmDialog = dynamic(
  () => import("@/components/gmao/premium/delete-confirm-dialog").then((m) => ({ default: m.DeleteConfirmDialog })),
  { ssr: false },
);

type TechnicianSearchRow = TechnicianRow & { searchBlob: string };
type AvailabilityFilter = "ALL" | TechnicianAvailability;

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tous" },
  ...Object.values(TechnicianAvailability).map((a) => ({
    value: a,
    label: technicianAvailabilityFr(a),
  })),
];

function buildSearchRows(technicians: TechnicianRow[]): TechnicianSearchRow[] {
  return technicians.map((t) => ({
    ...t,
    searchBlob: `${t.id} ${t.firstName} ${t.lastName} ${technicianSpecialtyFr(t.specialty)} ${technicianRoleFr(t.role)} ${technicianAvailabilityFr(t.availability)} ${t.email ?? ""} ${t.phone ?? ""} ${t.employeeCode ?? ""}`,
  }));
}

export function TechniciansModuleClient({ technicians: initialRows }: { technicians: TechnicianRow[] }) {
  const [rows, setRows] = React.useState(initialRows);
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const [status, setStatus] = React.useState<AvailabilityFilter>("ALL");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [viewTechnician, setViewTechnician] = React.useState<TechnicianRow | null>(null);
  const [editTechnician, setEditTechnician] = React.useState<TechnicianRow | null>(null);
  const [deleteTechnician, setDeleteTechnician] = React.useState<TechnicianRow | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);
  const [, startFilterTransition] = React.useTransition();

  const handleDebouncedSearch = React.useCallback((value: string) => {
    setDebouncedQ(value);
  }, []);

  React.useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const searchRows = React.useMemo(() => buildSearchRows(rows), [rows]);

  const filtered = React.useMemo(() => {
    const needle = debouncedQ.trim();
    return searchRows.filter((t) => {
      if (status !== "ALL" && t.availability !== status) return false;
      if (!needle) return true;
      return fuzzyMatch(needle, t.searchBlob);
    });
  }, [searchRows, debouncedQ, status]);

  React.useEffect(() => {
    const visible = new Set(filtered.map((t) => t.id));
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
        onChange: (v: string) => startFilterTransition(() => setStatus(v as AvailabilityFilter)),
        options: STATUS_OPTIONS,
      },
    ],
    [status],
  );

  const handleDeleted = React.useCallback((id: string) => {
    setRows((prev) => prev.filter((t) => t.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setViewTechnician((prev) => (prev?.id === id ? null : prev));
  }, []);

  const handleBulkDeleted = React.useCallback((ids: string[]) => {
    const removed = new Set(ids);
    setRows((prev) => prev.filter((t) => !removed.has(t.id)));
    setSelectedIds(new Set());
    setViewTechnician((prev) => (prev && removed.has(prev.id) ? null : prev));
  }, []);

  return (
    <GmaoModuleShell>
      <ModuleFilterBar
        layout="inline"
        onDebouncedSearchChange={handleDebouncedSearch}
        searchPlaceholder="Recherche : nom, prénom, spécialité, matricule…"
        resultCount={filtered.length}
        action={
          <AddTechnicianSheet
            onCreated={(created) => {
              setRows((prev) => [...prev, created].sort((a, b) => a.lastName.localeCompare(b.lastName, "fr")));
            }}
          />
        }
        exportActions={<TechniciansExportButtons technicians={filtered} />}
        filters={filters}
      />

      <TechniciansDataTable
        technicians={filtered}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onView={setViewTechnician}
        onEdit={setEditTechnician}
        onDelete={setDeleteTechnician}
        onBulkDelete={() => setBulkDeleteOpen(true)}
      />

      <TechnicianDetailSheet
        technicianId={viewTechnician?.id ?? null}
        technicianName={viewTechnician ? `${viewTechnician.firstName} ${viewTechnician.lastName}` : ""}
        open={Boolean(viewTechnician)}
        onOpenChange={(open) => {
          if (!open) setViewTechnician(null);
        }}
      />

      <TechnicianEditDialog
        technician={editTechnician}
        open={Boolean(editTechnician)}
        onOpenChange={(open) => {
          if (!open) setEditTechnician(null);
        }}
        onUpdated={(updated) => {
          setRows((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          setViewTechnician((prev) => (prev?.id === updated.id ? updated : prev));
        }}
      />

      <DeleteConfirmDialog
        open={Boolean(deleteTechnician)}
        onOpenChange={(open) => {
          if (!open) setDeleteTechnician(null);
        }}
        title="Confirmer la suppression"
        description={
          deleteTechnician
            ? `Supprimer le profil « ${deleteTechnician.firstName} ${deleteTechnician.lastName} » ? Les interventions liées conserveront l'historique sans technicien assigné.`
            : ""
        }
        onConfirm={async () => {
          if (!deleteTechnician) return { ok: false, error: "Technicien introuvable." };
          const res = await deleteTechnicianAction(deleteTechnician.id);
          return { ok: res.ok, error: res.ok ? undefined : res.error };
        }}
        onSuccess={() => {
          if (deleteTechnician) handleDeleted(deleteTechnician.id);
        }}
      />

      <DeleteConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Supprimer la sélection ?"
        description={`${selectedIds.size} technicien(s) seront définitivement supprimés.`}
        onConfirm={async () => {
          const res = await deleteTechniciansBulkAction(Array.from(selectedIds));
          if (!res.ok) return { ok: false, error: res.error };
          handleBulkDeleted(res.ids);
          return { ok: true };
        }}
      />
    </GmaoModuleShell>
  );
}
