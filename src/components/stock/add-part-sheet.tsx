"use client";

import { Loader2, Plus } from "lucide-react";
import * as React from "react";

import { createPartAction } from "@/app/actions/part";
import { PartFormFields } from "@/components/stock/part-form-fields";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { MachineOption, PartInventoryRow } from "@/lib/gmao/stock-parts-query";
import { cn } from "@/lib/utils";

type AddPartSheetProps = {
  machines: MachineOption[];
  onCreated?: (part: PartInventoryRow) => void;
};

export function AddPartSheet({ machines, onCreated }: AddPartSheetProps) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedMachineIds, setSelectedMachineIds] = React.useState<Set<string>>(new Set());
  const [preview, setPreview] = React.useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = React.useState("");
  const [imageError, setImageError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setSelectedMachineIds(new Set());
      setPreview(null);
      setImageDataUrl("");
      setImageError(null);
      setError(null);
    }
  }, [open]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("machineIds", JSON.stringify(Array.from(selectedMachineIds)));

    const res = await createPartAction(fd);
    setPending(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    const linkedMachines = machines.filter((m) => selectedMachineIds.has(m.id)).map((m) => ({
      id: m.id,
      name: m.name,
      legacyMatricule: null as number | null,
    }));

    const initialQty = Math.max(0, Math.floor(Number(fd.get("initialQuantity")) || 0));
    const minStock = Math.max(0, Math.floor(Number(fd.get("minStock")) || 0));

    onCreated?.({
      id: res.id,
      designation: String(fd.get("designation") ?? "").trim(),
      brand: String(fd.get("brand") ?? "").trim() || null,
      reference: String(fd.get("reference") ?? "").trim() || null,
      quantity: initialQty,
      minStock,
      hasImage: Boolean(imageDataUrl),
      machines: linkedMachines,
      isLowStock: initialQty <= minStock,
    });

    setOpen(false);
    e.currentTarget.reset();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        type="button"
        className={cn(buttonVariants({ size: "sm" }), "h-9 shrink-0 gap-2 rounded-xl bg-[#1F76FB] hover:bg-[#1a65d6]")}
      >
        <Plus className="h-4 w-4" aria-hidden />
        Nouvelle pièce
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Ajouter une pièce de rechange</SheetTitle>
          <SheetDescription>
            Renseignez le catalogue, associez les machines et définissez le stock initial.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4 py-4">
          <PartFormFields
            machines={machines}
            selectedMachineIds={selectedMachineIds}
            onSelectedMachineIdsChange={setSelectedMachineIds}
            mode="create"
            imageDataUrl={imageDataUrl}
            onImageDataUrlChange={setImageDataUrl}
            preview={preview}
            onPreviewChange={setPreview}
            imageError={imageError}
            onImageError={setImageError}
          />

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <SheetFooter className="mt-auto gap-2 sm:flex-col sm:space-x-0">
            <Button type="submit" disabled={pending} className="w-full bg-[#1F76FB] hover:bg-[#1a65d6]">
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Enregistrer la pièce
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
