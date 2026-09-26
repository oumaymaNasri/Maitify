"use client";

import { ArrowDownUp, CalendarClock, Eye, MapPin, Package, Phone, Settings2, UserRound, Wrench } from "lucide-react";

import { CatalogCardsGrid } from "@/components/gmao/catalog-cards-grid";
import { CatalogEntityCard } from "@/components/gmao/catalog-entity-card";
import type { MachineCardVm } from "@/components/machines/machine-card";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import type { PartInventoryRow } from "@/lib/gmao/stock-parts-query";
import type { TechnicianRow } from "@/lib/gmao/technicians-query";
import { machineImageApiUrl, partImageApiUrl } from "@/lib/media/image-api";
import { maintenanceFrequencyFr, technicianAvailabilityFr, technicianRoleFr, technicianSpecialtyFr } from "@/lib/view/gmao-labels";
import { formatLastIntervention, machineAssetStatusFr, machineStatusBadgeClass } from "@/lib/view/machine-labels";
import { technicianAvailabilityBadgeClass } from "@/lib/view/status-badges";
import { cn } from "@/lib/utils";

type Pager = {
  total: number;
  noun: string;
  page?: number;
  pageCount?: number;
  pageSize?: number;
  previousHref?: string;
  nextHref?: string;
};

type SelectProps<T> = {
  selectedIds: Set<string>;
  onToggleSelect: (id: string, checked: boolean) => void;
  onEdit: (row: T) => void;
  onDelete: (row: T) => void;
  onBulkDelete: () => void;
  pagination?: Pager;
};

export function MachinesCatalogCards({
  machines,
  selectedIds,
  onToggleSelect,
  onEdit,
  onDelete,
  onBulkDelete,
  pagination,
}: { machines: MachineCardVm[] } & SelectProps<MachineCardVm>) {
  return (
    <CatalogCardsGrid
      isEmpty={machines.length === 0}
      emptyMessage="Aucun équipement ne correspond aux filtres."
      selectedCount={selectedIds.size}
      onBulkDelete={onBulkDelete}
      pagination={pagination}
    >
      {machines.map((m) => (
        <CatalogEntityCard
          key={m.id}
          title={m.name}
          kicker={m.legacyMatricule != null ? `M${m.legacyMatricule}` : m.id.slice(0, 8)}
          imageUrl={m.hasCoverImage ? machineImageApiUrl(m.id) : null}
          fallbackIcon={Settings2}
          selected={selectedIds.has(m.id)}
          onToggleSelect={(checked) => onToggleSelect(m.id, checked)}
          selectLabel={`Sélectionner ${m.name}`}
          onEdit={() => onEdit(m)}
          onDelete={() => onDelete(m)}
          badge={
            <Badge className={cn("text-[11px] font-medium", machineStatusBadgeClass(m.assetStatus))}>
              {machineAssetStatusFr(m.assetStatus)}
            </Badge>
          }
          meta={[
            { icon: MapPin, text: m.location },
            { icon: Wrench, text: maintenanceFrequencyFr(m.maintenanceSector) },
            { icon: CalendarClock, text: formatLastIntervention(m.lastInterventionAt) },
          ]}
          footer={
            <ButtonLink href={`/machines/${m.id}/historique`} size="sm" variant="outline">
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Profil
            </ButtonLink>
          }
        />
      ))}
    </CatalogCardsGrid>
  );
}

export function TechniciansCatalogCards({
  technicians,
  selectedIds,
  onToggleSelect,
  onEdit,
  onDelete,
  onView,
  onBulkDelete,
}: { technicians: TechnicianRow[]; onView: (row: TechnicianRow) => void } & SelectProps<TechnicianRow>) {
  return (
    <CatalogCardsGrid
      isEmpty={technicians.length === 0}
      emptyMessage="Aucun technicien ne correspond aux filtres."
      selectedCount={selectedIds.size}
      onBulkDelete={onBulkDelete}
      pagination={{ total: technicians.length, noun: "technicien(s)" }}
    >
      {technicians.map((t) => (
        <CatalogEntityCard
          key={t.id}
          title={`${t.firstName} ${t.lastName}`}
          kicker={t.employeeCode ? `Mat. ${t.employeeCode}` : t.id.slice(0, 8)}
          fallbackIcon={UserRound}
          selected={selectedIds.has(t.id)}
          onToggleSelect={(checked) => onToggleSelect(t.id, checked)}
          selectLabel={`Sélectionner ${t.firstName} ${t.lastName}`}
          onEdit={() => onEdit(t)}
          onDelete={() => onDelete(t)}
          badge={
            <Badge className={cn("text-[11px] font-medium", technicianAvailabilityBadgeClass(t.availability))}>
              {technicianAvailabilityFr(t.availability)}
            </Badge>
          }
          meta={[
            { icon: Wrench, text: technicianSpecialtyFr(t.specialty) },
            { icon: UserRound, text: technicianRoleFr(t.role) },
            { icon: Phone, text: t.phone || t.email || "—" },
          ]}
          footer={
            <Button type="button" size="sm" variant="outline" onClick={() => onView(t)}>
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Profil
            </Button>
          }
        />
      ))}
    </CatalogCardsGrid>
  );
}

export function PartsCatalogCards({
  parts,
  selectedIds,
  onToggleSelect,
  onEdit,
  onDelete,
  onAdjust,
  onBulkDelete,
  pagination,
}: { parts: PartInventoryRow[]; onAdjust: (row: PartInventoryRow) => void } & SelectProps<PartInventoryRow>) {
  return (
    <CatalogCardsGrid
      isEmpty={parts.length === 0}
      emptyMessage="Aucune pièce ne correspond aux filtres."
      selectedCount={selectedIds.size}
      onBulkDelete={onBulkDelete}
      pagination={pagination}
    >
      {parts.map((p) => (
        <CatalogEntityCard
          key={p.id}
          title={p.designation}
          kicker={[p.brand, p.reference].filter(Boolean).join(" · ") || p.id.slice(0, 8)}
          imageUrl={p.hasImage ? partImageApiUrl(p.id) : null}
          fallbackIcon={Package}
          selected={selectedIds.has(p.id)}
          onToggleSelect={(checked) => onToggleSelect(p.id, checked)}
          selectLabel={`Sélectionner ${p.designation}`}
          onEdit={() => onEdit(p)}
          onDelete={() => onDelete(p)}
          badge={
            p.isLowStock ? (
              <Badge className="rounded-full border-0 bg-rose-100 font-medium text-rose-800 hover:bg-rose-100">
                Rupture / Alerte
              </Badge>
            ) : (
              <Badge className="rounded-full border-0 bg-emerald-100 font-medium text-emerald-800 hover:bg-emerald-100">
                Stock OK
              </Badge>
            )
          }
          meta={[
            { icon: Package, text: `Stock ${p.quantity} · seuil ${p.minStock}` },
            {
              icon: Wrench,
              text: p.machines.length ? p.machines.map((m) => m.name).join(", ") : "Magasin général",
            },
          ]}
          footer={
            <Button type="button" size="sm" variant="outline" onClick={() => onAdjust(p)}>
              <ArrowDownUp className="mr-1.5 h-3.5 w-3.5" />
              Ajuster
            </Button>
          }
        />
      ))}
    </CatalogCardsGrid>
  );
}
