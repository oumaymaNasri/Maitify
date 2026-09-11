"use client";

import * as React from "react";

import { MachineMultiSelect } from "@/components/maintenance-orders/maintenance-order-form-fields";
import type { MachineOption } from "@/lib/gmao/stock-parts-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptimizedImage } from "@/components/ui/optimized-image";

const MAX_IMAGE_BYTES = 1_200_000;

type PartFormFieldsProps = {
  machines: MachineOption[];
  selectedMachineIds: Set<string>;
  onSelectedMachineIdsChange: (ids: Set<string>) => void;
  mode: "create" | "edit";
  defaultValues?: {
    designation?: string;
    brand?: string;
    reference?: string;
    minStock?: number;
    initialQuantity?: number;
    imageUrl?: string | null;
  };
  imageDataUrl: string;
  onImageDataUrlChange: (v: string) => void;
  preview: string | null;
  onPreviewChange: (v: string | null) => void;
  imageError?: string | null;
  onImageError?: (msg: string | null) => void;
};

export function PartFormFields({
  machines,
  selectedMachineIds,
  onSelectedMachineIdsChange,
  mode,
  defaultValues,
  imageDataUrl,
  onImageDataUrlChange,
  preview,
  onPreviewChange,
  imageError,
  onImageError,
}: PartFormFieldsProps) {
  const onImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > MAX_IMAGE_BYTES) {
      onImageError?.("Image invalide ou trop volumineuse (max 1,2 Mo).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      onPreviewChange(result);
      onImageDataUrlChange(result);
      onImageError?.(null);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="part-designation">Désignation *</Label>
        <Input
          id="part-designation"
          name="designation"
          defaultValue={defaultValues?.designation ?? ""}
          required
          placeholder="Ex. Courroie trapézoïdale"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="part-brand">Marque</Label>
          <Input id="part-brand" name="brand" defaultValue={defaultValues?.brand ?? ""} placeholder="Ex. Gates" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="part-reference">Référence</Label>
          <Input
            id="part-reference"
            name="reference"
            defaultValue={defaultValues?.reference ?? ""}
            placeholder="Ex. XPZ-1120"
            className="font-mono"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="part-minStock">Seuil d&apos;alerte *</Label>
          <Input
            id="part-minStock"
            name="minStock"
            type="number"
            min={0}
            defaultValue={defaultValues?.minStock ?? 0}
            required
          />
        </div>
        {mode === "create" ? (
          <div className="space-y-1.5">
            <Label htmlFor="part-initialQuantity">Quantité initiale</Label>
            <Input
              id="part-initialQuantity"
              name="initialQuantity"
              type="number"
              min={0}
              defaultValue={defaultValues?.initialQuantity ?? 0}
            />
          </div>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label>Machines associées</Label>
        <MachineMultiSelect
          machines={machines}
          selectedIds={selectedMachineIds}
          onSelectedIdsChange={onSelectedMachineIdsChange}
          placeholder="Rechercher une machine à associer…"
        />
        <input type="hidden" name="machineIds" value={JSON.stringify(Array.from(selectedMachineIds))} readOnly />
        <p className="text-xs text-muted-foreground">
          La pièce peut être affectée à une ou plusieurs machines.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="part-image">Image</Label>
        {preview ? (
          <div className="relative h-32 w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            <OptimizedImage src={preview} alt="" fill sizes="320px" className="object-contain p-2" />
          </div>
        ) : null}
        <Input id="part-image" type="file" accept="image/*" onChange={onImageChange} />
        <input type="hidden" name="imageDataUrl" value={imageDataUrl} readOnly />
        <input type="hidden" name="imageUrl" value={defaultValues?.imageUrl ?? ""} readOnly />
        {imageError ? <p className="text-xs text-rose-600">{imageError}</p> : null}
      </div>
    </div>
  );
}
