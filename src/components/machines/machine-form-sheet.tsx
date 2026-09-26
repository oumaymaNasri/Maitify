"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MachineAssetStatus, MaintenanceFrequency } from "@prisma/client";
import { Loader2, Plus } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";

import { createMachineAction, updateMachineAction } from "@/app/actions/machine";
import type { MachineCardVm } from "@/components/machines/machine-card";
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
import { Textarea } from "@/components/ui/textarea";
import { machineFormSchema, type MachineFormInput } from "@/lib/validations/machine";
import { maintenanceFrequencyFr } from "@/lib/view/gmao-labels";
import { machineAssetStatusFr } from "@/lib/view/machine-labels";
import { cn } from "@/lib/utils";

type MachineFormSheetProps = {
  mode?: "create" | "edit";
  machine?: MachineCardVm | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  onCreated?: (machine: MachineCardVm) => void;
  onUpdated?: (machine: MachineCardVm) => void;
};

export function MachineFormSheet({
  mode: modeProp,
  machine,
  open: controlledOpen,
  onOpenChange,
  trigger,
  onCreated,
  onUpdated,
}: MachineFormSheetProps) {
  const isEdit = modeProp === "edit" || Boolean(machine?.id);
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [imageDataUrl, setImageDataUrl] = React.useState("");

  const form = useForm<MachineFormInput>({
    resolver: zodResolver(machineFormSchema),
    defaultValues: {
      id: machine?.id,
      name: machine?.name ?? "",
      location: machine?.location ?? "",
      maintenanceSector: machine?.maintenanceSector ?? MaintenanceFrequency.HEBDOMADAIRE,
      assetStatus: machine?.assetStatus ?? MachineAssetStatus.OPERATIONAL,
      description: machine?.description ?? "",
      imageUrl: machine?.imageUrl ?? machine?.coverImageUrl ?? "",
      imageDataUrl: undefined,
    },
  });

  React.useEffect(() => {
    if (open && machine) {
      form.reset({
        id: machine.id,
        name: machine.name,
        location: machine.location,
        maintenanceSector: machine.maintenanceSector,
        assetStatus: machine.assetStatus,
        description: machine.description ?? "",
        imageUrl: machine.imageUrl ?? machine.coverImageUrl ?? "",
      });
      setImageDataUrl("");
    }
    if (open && !machine && !isEdit) {
      form.reset({
        name: "",
        location: "",
        maintenanceSector: MaintenanceFrequency.HEBDOMADAIRE,
        assetStatus: MachineAssetStatus.OPERATIONAL,
        description: "",
        imageUrl: "",
      });
      setImageDataUrl("");
    }
  }, [open, machine, isEdit, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const fd = new FormData();
    if (values.id) fd.set("id", values.id);
    fd.set("name", values.name);
    fd.set("location", values.location);
    fd.set("maintenanceSector", values.maintenanceSector);
    fd.set("assetStatus", values.assetStatus);
    fd.set("description", values.description ?? "");
    if (imageDataUrl) fd.set("imageDataUrl", imageDataUrl);
    else if (values.imageUrl?.trim()) fd.set("imageUrl", values.imageUrl.trim());

    const res = isEdit ? await updateMachineAction(fd) : await createMachineAction(fd);
    if (!res.ok) {
      form.setError("root", { message: res.error });
      return;
    }
    const vm: MachineCardVm = {
      id: res.id,
      name: values.name,
      location: values.location,
      legacyMatricule: machine?.legacyMatricule ?? null,
      targetAvailability: machine?.targetAvailability ?? null,
      assetStatus: values.assetStatus,
      maintenanceSector: values.maintenanceSector,
      hasCoverImage: Boolean(imageDataUrl || values.imageUrl?.trim()),
      interventionCount: machine?.interventionCount ?? 0,
      galleryCount: machine?.galleryCount ?? 0,
      qrCode: machine?.qrCode ?? null,
      lastInterventionAt: machine?.lastInterventionAt ?? null,
    };
    if (isEdit) onUpdated?.(vm);
    else onCreated?.(vm);
    setOpen(false);
  });

  const pending = form.formState.isSubmitting;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {trigger && React.isValidElement(trigger) ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      {!trigger && !isEdit ? (
        <SheetTrigger type="button" className={cn(buttonVariants({ size: "sm" }), "gap-2 bg-blue-600 hover:bg-blue-700")}>
          <Plus className="h-4 w-4" />
          Ajouter une machine
        </SheetTrigger>
      ) : null}
      <SheetContent side="right" className="flex w-full flex-col overflow-y-auto border-slate-200 bg-white sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="text-slate-900">{isEdit ? "Modifier l'équipement" : "Nouvel équipement"}</SheetTitle>
          <SheetDescription className="text-slate-600">
            Validation Zod — enregistrement sécurisé dans le parc GMAO.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} className="mt-6 flex flex-1 flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="machine-name">Nom *</Label>
            <Input id="machine-name" {...form.register("name")} disabled={pending} />
            {form.formState.errors.name ? (
              <p className="text-xs text-rose-600">{form.formState.errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="machine-location">Emplacement *</Label>
            <Input id="machine-location" {...form.register("location")} disabled={pending} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Fréquence maintenance *</Label>
              <Select
                value={form.watch("maintenanceSector")}
                onValueChange={(v) => form.setValue("maintenanceSector", v as MaintenanceFrequency)}
                disabled={pending}
              >
                <SelectTrigger>
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
              <Label>Statut *</Label>
              <Select
                value={form.watch("assetStatus")}
                onValueChange={(v) => form.setValue("assetStatus", v as MachineAssetStatus)}
                disabled={pending}
              >
                <SelectTrigger>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="machine-desc">Description</Label>
            <Textarea id="machine-desc" {...form.register("description")} rows={3} disabled={pending} />
          </div>

          <MachineImageFields
            key={open && machine ? machine.id : "machine-sheet-new"}
            idPrefix="machine-sheet"
            imageUrl={form.watch("imageUrl") ?? ""}
            onImageUrlChange={(v) => form.setValue("imageUrl", v, { shouldDirty: true })}
            imageDataUrl={imageDataUrl}
            onImageDataUrlChange={(v) => {
              setImageDataUrl(v);
              form.setValue("imageDataUrl", v || undefined);
            }}
            alt={form.watch("name") || "Aperçu machine"}
            disabled={pending}
            urlError={form.formState.errors.imageUrl?.message}
          />

          {form.formState.errors.root ? (
            <p className="text-sm text-rose-600">{form.formState.errors.root.message}</p>
          ) : null}

          <SheetFooter className="mt-auto gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending} className="bg-blue-600 hover:bg-blue-700">
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isEdit ? "Mettre à jour" : "Enregistrer"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
