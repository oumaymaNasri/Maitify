"use client";

import { Loader2 } from "lucide-react";
import * as React from "react";

import { updatePartAction } from "@/app/actions/part";
import { PartFormFields } from "@/components/stock/part-form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MachineOption, PartInventoryRow } from "@/lib/gmao/stock-parts-query";
import { partImageApiUrl } from "@/lib/media/image-api";

type PartEditDialogProps = {
  part: PartInventoryRow | null;
  machines: MachineOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (part: PartInventoryRow) => void;
};

export function PartEditDialog({ part, machines, open, onOpenChange, onUpdated }: PartEditDialogProps) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedMachineIds, setSelectedMachineIds] = React.useState<Set<string>>(new Set());
  const [preview, setPreview] = React.useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = React.useState("");
  const [imageError, setImageError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open && part) {
      setSelectedMachineIds(new Set(part.machines.map((m) => m.id)));
      setPreview(part.hasImage ? partImageApiUrl(part.id) : null);
      setImageDataUrl("");
      setImageError(null);
      setError(null);
    }
  }, [open, part]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!part) return;
    setPending(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    fd.set("id", part.id);
    fd.set("machineIds", JSON.stringify(Array.from(selectedMachineIds)));
    fd.set("quantity", String(part.quantity));

    const res = await updatePartAction(fd);
    setPending(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    const linkedMachines = machines
      .filter((m) => selectedMachineIds.has(m.id))
      .map((m) => {
        const existing = part.machines.find((pm) => pm.id === m.id);
        return { id: m.id, name: m.name, legacyMatricule: existing?.legacyMatricule ?? null };
      });

    const minStock = Math.max(0, Math.floor(Number(fd.get("minStock")) || 0));
    const hasImage = Boolean(imageDataUrl) || part.hasImage;

    onUpdated?.({
      id: part.id,
      designation: String(fd.get("designation") ?? "").trim(),
      brand: String(fd.get("brand") ?? "").trim() || null,
      reference: String(fd.get("reference") ?? "").trim() || null,
      quantity: part.quantity,
      minStock,
      hasImage,
      machines: linkedMachines,
      isLowStock: part.quantity <= minStock,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier la pièce</DialogTitle>
          <DialogDescription>{part?.designation}</DialogDescription>
        </DialogHeader>

        {part ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <PartFormFields
              machines={machines}
              selectedMachineIds={selectedMachineIds}
              onSelectedMachineIdsChange={setSelectedMachineIds}
              mode="edit"
              defaultValues={{
                designation: part.designation,
                brand: part.brand ?? "",
                reference: part.reference ?? "",
                minStock: part.minStock,
              }}
              imageDataUrl={imageDataUrl}
              onImageDataUrlChange={setImageDataUrl}
              preview={preview}
              onPreviewChange={setPreview}
              imageError={imageError}
              onImageError={setImageError}
            />

            {error ? <p className="text-sm text-rose-600">{error}</p> : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                Annuler
              </Button>
              <Button type="submit" disabled={pending} className="bg-[#1F76FB] hover:bg-[#1a65d6]">
                {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
