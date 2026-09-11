"use client";

import { ArrowDownUp, Edit2, Package, Trash2 } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OptimizedImage } from "@/components/ui/optimized-image";
import type { PartInventoryRow } from "@/lib/gmao/stock-parts-query";
import { partImageApiUrl } from "@/lib/media/image-api";
import { cn } from "@/lib/utils";

type StockInventoryGridProps = {
  parts: PartInventoryRow[];
  selectedIds: Set<string>;
  onSelectedIdsChange: (ids: Set<string>) => void;
  onEdit: (part: PartInventoryRow) => void;
  onDelete: (part: PartInventoryRow) => void;
  onAdjust: (part: PartInventoryRow) => void;
  onBulkDelete: () => void;
};

function RowCheckbox({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      aria-label={ariaLabel}
      className="h-4 w-4 rounded border-slate-300 text-[#1F76FB] focus:ring-[#1F76FB]"
      onClick={(e) => e.stopPropagation()}
    />
  );
}

type PartCardProps = {
  part: PartInventoryRow;
  selected: boolean;
  onToggleSelect: (checked: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onAdjust: () => void;
};

const PartInventoryCard = React.memo(function PartInventoryCard({
  part,
  selected,
  onToggleSelect,
  onEdit,
  onDelete,
  onAdjust,
}: PartCardProps) {
  const critical = part.isLowStock;

  return (
    <Card
      className={cn(
        "overflow-hidden border-slate-200 shadow-sm transition-shadow hover:shadow-md",
        selected && "ring-2 ring-[#1F76FB]/40",
        critical && "border-rose-200",
      )}
    >
      <div className="relative aspect-[4/3] bg-slate-50">
        {part.hasImage ? (
          <OptimizedImage
            src={partImageApiUrl(part.id)}
            alt={part.designation}
            fill
            sizes="280px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300">
            <Package className="h-12 w-12" />
          </div>
        )}
        <div className="absolute left-2 top-2">
          <RowCheckbox
            checked={selected}
            onChange={onToggleSelect}
            ariaLabel={`Sélectionner ${part.designation}`}
          />
        </div>
        {critical ? (
          <Badge className="absolute right-2 top-2 border border-rose-300 bg-rose-600 text-white hover:bg-rose-600">
            Rupture / Alerte
          </Badge>
        ) : null}
      </div>

      <CardContent className="space-y-3 p-4">
        <div>
          <h3 className="font-semibold leading-tight text-slate-900">{part.designation}</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {[part.brand, part.reference].filter(Boolean).join(" · ") || "Sans marque / référence"}
          </p>
        </div>

        <div className="flex flex-wrap gap-1">
          {part.machines.length > 0 ? (
            part.machines.map((m) => (
              <Badge key={m.id} variant="secondary" className="text-[10px] font-normal">
                {m.name}
              </Badge>
            ))
          ) : (
            <Badge variant="outline" className="text-[10px] font-normal text-slate-500">
              Magasin général
            </Badge>
          )}
        </div>

        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Stock actuel</p>
            <p className={cn("text-2xl font-bold tabular-nums", critical ? "text-rose-600" : "text-slate-900")}>
              {part.quantity}
            </p>
            <p className="text-xs text-slate-500">Seuil : {part.minStock}</p>
          </div>

          <div className="flex gap-1">
            <Button type="button" size="icon" variant="outline" className="h-8 w-8" title="Ajuster le stock" onClick={onAdjust}>
              <ArrowDownUp className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" size="icon" variant="outline" className="h-8 w-8" title="Modifier" onClick={onEdit}>
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" size="icon" variant="outline" className="h-8 w-8 text-rose-600 hover:bg-rose-50" title="Supprimer" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

function StockInventoryGridInner({
  parts,
  selectedIds,
  onSelectedIdsChange,
  onEdit,
  onDelete,
  onAdjust,
  onBulkDelete,
}: StockInventoryGridProps) {
  const visibleIds = React.useMemo(() => parts.map((p) => p.id), [parts]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id));
  const selectAllRef = React.useRef<HTMLInputElement>(null);

  const toggleAllVisible = React.useCallback(
    (checked: boolean) => {
      const next = new Set(selectedIds);
      if (checked) visibleIds.forEach((id) => next.add(id));
      else visibleIds.forEach((id) => next.delete(id));
      onSelectedIdsChange(next);
    },
    [onSelectedIdsChange, selectedIds, visibleIds],
  );

  const toggleRow = React.useCallback(
    (id: string, checked: boolean) => {
      const next = new Set(selectedIds);
      if (checked) next.add(id);
      else next.delete(id);
      onSelectedIdsChange(next);
    },
    [onSelectedIdsChange, selectedIds],
  );

  React.useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected && !allVisibleSelected;
    }
  }, [someVisibleSelected, allVisibleSelected]);

  if (parts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
        <Package className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <p className="font-medium text-slate-700">Aucune pièce trouvée</p>
        <p className="mt-1 text-sm text-slate-500">Modifiez vos filtres ou ajoutez une nouvelle pièce.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            ref={selectAllRef}
            type="checkbox"
            checked={allVisibleSelected}
            onChange={(e) => toggleAllVisible(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-[#1F76FB] focus:ring-[#1F76FB]"
          />
          Tout sélectionner ({parts.length})
        </label>

        {selectedIds.size > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onBulkDelete}
            className="h-8 border-rose-200 text-rose-700 hover:bg-rose-50"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Supprimer ({selectedIds.size})
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {parts.map((part) => (
          <PartInventoryCard
            key={part.id}
            part={part}
            selected={selectedIds.has(part.id)}
            onToggleSelect={(checked) => toggleRow(part.id, checked)}
            onEdit={() => onEdit(part)}
            onDelete={() => onDelete(part)}
            onAdjust={() => onAdjust(part)}
          />
        ))}
      </div>
    </div>
  );
}

export const StockInventoryGrid = React.memo(StockInventoryGridInner);
