"use client";

import { MachineAssetStatus, MaintenanceFrequency } from "@prisma/client";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { createMachineAction } from "@/app/actions/machine";
import { MachineImageFields } from "@/components/machines/machine-image-fields";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { maintenanceFrequencyFr } from "@/lib/view/gmao-labels";
import { machineAssetStatusFr } from "@/lib/view/machine-labels";
import { cn } from "@/lib/utils";

export function AddMachineSheet() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [imageUrl, setImageUrl] = React.useState("");
  const [imageDataUrl, setImageDataUrl] = React.useState("");
  const [assetStatus, setAssetStatus] = React.useState<MachineAssetStatus>(MachineAssetStatus.OPERATIONAL);
  const [maintenanceSector, setMaintenanceSector] = React.useState<MaintenanceFrequency>(
    MaintenanceFrequency.HEBDOMADAIRE,
  );

  const reset = () => {
    setError(null);
    setImageUrl("");
    setImageDataUrl("");
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("assetStatus", assetStatus);
    fd.set("maintenanceSector", maintenanceSector);
    if (imageDataUrl) fd.set("imageDataUrl", imageDataUrl);
    else if (imageUrl.trim()) fd.set("imageUrl", imageUrl.trim());

    const res = await createMachineAction(fd);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setOpen(false);
    reset();
    form.reset();
    router.refresh();
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <SheetTrigger type="button" className={cn(buttonVariants({ size: "sm" }), "shrink-0 gap-2")}>
        <Plus className="h-4 w-4" aria-hidden />
        Ajouter une machine
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Nouvel équipement</SheetTitle>
          <SheetDescription>
            Enregistrement dans le parc GMAO — un QR code unique sera généré automatiquement.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="mt-6 flex flex-1 flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="machine-name">Nom *</Label>
            <Input id="machine-name" name="name" required placeholder="Ex. Pompe circulation n°3" disabled={pending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="machine-location">Emplacement *</Label>
            <Input id="machine-location" name="location" required placeholder="Ex. RC, Hall A, Ligne 2" disabled={pending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="machine-sector">Fréquence maintenance *</Label>
            <Select
              value={maintenanceSector}
              onValueChange={(v) => setMaintenanceSector(v as MaintenanceFrequency)}
              disabled={pending}
            >
              <SelectTrigger id="machine-sector">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(MaintenanceFrequency).map((f) => (
                  <SelectItem key={f} value={f}>
                    {maintenanceFrequencyFr(f)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="machine-status">Statut initial</Label>
            <Select value={assetStatus} onValueChange={(v) => setAssetStatus(v as MachineAssetStatus)} disabled={pending}>
              <SelectTrigger id="machine-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(MachineAssetStatus).map((s) => (
                  <SelectItem key={s} value={s}>
                    {machineAssetStatusFr(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <MachineImageFields
            key={open ? "add-machine-open" : "add-machine-closed"}
            idPrefix="add-machine"
            imageUrl={imageUrl}
            onImageUrlChange={setImageUrl}
            imageDataUrl={imageDataUrl}
            onImageDataUrlChange={setImageDataUrl}
            alt="Aperçu machine"
            disabled={pending}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <SheetFooter className="mt-auto gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending} className="gap-2">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Enregistrer
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
