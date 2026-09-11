"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MachineAssetStatus, MaintenanceFrequency } from "@prisma/client";
import { Loader2, Pencil } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";

import { updateMachineAction } from "@/app/actions/machine";
import type { MachineCardVm } from "@/components/machines/machine-card";
import { MachineImageBlock } from "@/components/machines/machine-image-block";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { machineEditFormSchema, type MachineEditFormInput } from "@/lib/validations/machine";
import { maintenanceFrequencyFr } from "@/lib/view/gmao-labels";
import { machineAssetStatusFr } from "@/lib/view/machine-labels";

type MachineEditDialogProps = {
  machine: MachineCardVm | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (machine: MachineCardVm) => void;
};

export function MachineEditDialog({ machine, open, onOpenChange, onUpdated }: MachineEditDialogProps) {
  const form = useForm<MachineEditFormInput>({
    resolver: zodResolver(machineEditFormSchema),
    defaultValues: {
      id: "",
      name: "",
      legacyMatricule: undefined,
      location: "",
      maintenanceSector: MaintenanceFrequency.HEBDOMADAIRE,
      assetStatus: MachineAssetStatus.OPERATIONAL,
      targetAvailabilityPct: 95,
    },
  });

  React.useEffect(() => {
    if (open && machine) {
      form.reset({
        id: machine.id,
        name: machine.name,
        legacyMatricule: machine.legacyMatricule ?? undefined,
        location: machine.location,
        maintenanceSector: machine.maintenanceSector,
        assetStatus: machine.assetStatus,
        targetAvailabilityPct:
          machine.targetAvailability != null ? Math.round(machine.targetAvailability * 100) : 95,
        imageUrl: machine.imageUrl ?? machine.coverImageUrl ?? "",
      });
    }
  }, [open, machine, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!machine) return;

    const fd = new FormData();
    fd.set("id", values.id ?? machine.id);
    fd.set("name", values.name);
    if (values.legacyMatricule != null) fd.set("legacyMatricule", String(values.legacyMatricule));
    fd.set("location", values.location);
    fd.set("maintenanceSector", values.maintenanceSector);
    fd.set("assetStatus", values.assetStatus);
    if (values.targetAvailabilityPct != null) {
      fd.set("targetAvailabilityPct", String(values.targetAvailabilityPct));
    }
    if (values.imageUrl?.trim()) {
      fd.set("imageUrl", values.imageUrl.trim());
    }

    const res = await updateMachineAction(fd);
    if (!res.ok) {
      form.setError("root", { message: res.error });
      return;
    }

    onUpdated({
      ...machine,
      name: values.name,
      legacyMatricule:
        values.legacyMatricule === undefined || values.legacyMatricule === ""
          ? null
          : Math.trunc(Number(values.legacyMatricule)) || null,
      location: values.location,
      maintenanceSector: values.maintenanceSector,
      assetStatus: values.assetStatus,
      targetAvailability:
        values.targetAvailabilityPct != null ? values.targetAvailabilityPct / 100 : machine.targetAvailability,
      imageUrl: values.imageUrl?.trim() || null,
      coverImageUrl: values.imageUrl?.trim() || null,
    });
    onOpenChange(false);
  });

  const pending = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-xl border-slate-100 bg-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <Pencil className="h-5 w-5 text-[#1F76FB]" />
            Modifier la machine
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            Mettez à jour les informations de l&apos;équipement sélectionné.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-name">Nom *</Label>
              <Input
                id="edit-name"
                {...form.register("name")}
                disabled={pending}
                className="rounded-xl border-slate-100"
              />
              {form.formState.errors.name ? (
                <p className="text-xs text-rose-600">{form.formState.errors.name.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-ref">Référence</Label>
              <Input
                id="edit-ref"
                type="number"
                min={1}
                placeholder="Ex. 1042"
                {...form.register("legacyMatricule")}
                disabled={pending}
                className="rounded-xl border-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-charge">Charge utile (%)</Label>
              <Input
                id="edit-charge"
                type="number"
                min={0}
                max={100}
                {...form.register("targetAvailabilityPct", { valueAsNumber: true })}
                disabled={pending}
                className="rounded-xl border-slate-100"
              />
              {form.formState.errors.targetAvailabilityPct ? (
                <p className="text-xs text-rose-600">{form.formState.errors.targetAvailabilityPct.message}</p>
              ) : null}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-location">Emplacement *</Label>
              <Input
                id="edit-location"
                {...form.register("location")}
                disabled={pending}
                className="rounded-xl border-slate-100"
              />
              {form.formState.errors.location ? (
                <p className="text-xs text-rose-600">{form.formState.errors.location.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Statut *</Label>
              <Select
                value={form.watch("assetStatus")}
                onValueChange={(v) => form.setValue("assetStatus", v as MachineAssetStatus)}
                disabled={pending}
              >
                <SelectTrigger className="rounded-xl border-slate-100">
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

            <div className="space-y-2">
              <Label>Fréquence *</Label>
              <Select
                value={form.watch("maintenanceSector")}
                onValueChange={(v) => form.setValue("maintenanceSector", v as MaintenanceFrequency)}
                disabled={pending}
              >
                <SelectTrigger className="rounded-xl border-slate-100">
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
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="edit-image-url">URL de l&apos;image de l&apos;équipement</Label>
            <Input
              id="edit-image-url"
              type="url"
              placeholder="https://… ou /images/machine.jpg"
              {...form.register("imageUrl")}
              disabled={pending}
              className="rounded-xl border-slate-100"
            />
            {form.formState.errors.imageUrl ? (
              <p className="text-xs text-rose-600">{form.formState.errors.imageUrl.message}</p>
            ) : null}
            <MachineImageBlock
              imageUrl={form.watch("imageUrl")?.trim() || null}
              alt={form.watch("name") || "Aperçu machine"}
              className="mb-0 mt-2"
            />
          </div>

          {form.formState.errors.root ? (
            <p className="text-sm text-rose-600">{form.formState.errors.root.message}</p>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenChange(false)}
              className="rounded-xl border-slate-100"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-[#1F76FB] hover:bg-[#1865D9]"
            >
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Enregistrer les modifications
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
