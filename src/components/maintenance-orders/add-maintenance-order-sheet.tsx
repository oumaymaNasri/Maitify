"use client";

import { InterventionType } from "@prisma/client";
import {
  CalendarDays,
  ClipboardCheck,
  Loader2,
  MessageSquareText,
  Plus,
  Settings2,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import * as React from "react";

import { createMaintenanceOrderAction } from "@/app/actions/maintenance-order";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import type { MaintenanceOrderRow } from "@/lib/gmao/maintenance-orders-query";
import { cn } from "@/lib/utils";
import { interventionTypeFr } from "@/lib/view/labels";
import {
  FormFieldLabel,
  MachineMultiSelect,
  MaintenanceTaskCheckbox,
  type MachineMultiSelectOption,
} from "@/components/maintenance-orders/maintenance-order-form-fields";

export type MachineOption = MachineMultiSelectOption;

type AddMaintenanceOrderSheetProps = {
  machines: MachineOption[];
  onCreated?: (order: MaintenanceOrderRow) => void;
};

function dateInputValue(d = new Date()): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function resetTaskState(setters: {
  setTaskNettoyage: (v: boolean) => void;
  setTaskGraissage: (v: boolean) => void;
  setTaskHuile: (v: boolean) => void;
  setTaskControl: (v: boolean) => void;
  setTaskNonConforme: (v: boolean) => void;
}) {
  setters.setTaskNettoyage(false);
  setters.setTaskGraissage(false);
  setters.setTaskHuile(false);
  setters.setTaskControl(false);
  setters.setTaskNonConforme(false);
}

export function AddMaintenanceOrderSheet({ machines, onCreated }: AddMaintenanceOrderSheetProps) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [interventionType, setInterventionType] = React.useState<InterventionType>(InterventionType.PREVENTIVE);
  const [selectedMachineIds, setSelectedMachineIds] = React.useState<Set<string>>(new Set());
  const [taskNettoyage, setTaskNettoyage] = React.useState(false);
  const [taskGraissage, setTaskGraissage] = React.useState(false);
  const [taskHuile, setTaskHuile] = React.useState(false);
  const [taskControl, setTaskControl] = React.useState(false);
  const [taskNonConforme, setTaskNonConforme] = React.useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setError(null);
      setSelectedMachineIds(new Set());
      resetTaskState({ setTaskNettoyage, setTaskGraissage, setTaskHuile, setTaskControl, setTaskNonConforme });
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    fd.set("interventionType", interventionType);
    fd.set("machineIds", Array.from(selectedMachineIds).join(","));
    fd.set("taskNettoyage", String(taskNettoyage));
    fd.set("taskGraissage", String(taskGraissage));
    fd.set("taskHuile", String(taskHuile));
    fd.set("taskControl", String(taskControl));
    fd.set("taskNonConforme", String(taskNonConforme));

    const res = await createMaintenanceOrderAction(fd);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }

    const machineNames = machines.filter((m) => selectedMachineIds.has(m.id)).map((m) => m.name).join(", ");
    handleOpenChange(false);
    e.currentTarget.reset();

    onCreated?.({
      id: res.id,
      reference: "",
      plannedDate: fd.get("plannedDate")?.toString() ?? new Date().toISOString(),
      interventionType,
      status: "ACTIVE",
      observationComment: fd.get("observationComment")?.toString().trim() || null,
      managerApproval: fd.get("managerApproval")?.toString().trim() || null,
      machineCount: selectedMachineIds.size,
      machineNames,
      pendingLineCount: selectedMachineIds.size,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger
        type="button"
        className={cn(buttonVariants({ size: "sm" }), "h-9 shrink-0 gap-2 rounded-xl bg-[#1F76FB] hover:bg-[#1a65d6]")}
      >
        <Plus className="h-4 w-4" aria-hidden />
        Nouvel ordre
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col overflow-y-auto border-slate-200 sm:max-w-lg">
        <SheetHeader className="space-y-1 border-b border-slate-100 pb-4">
          <SheetTitle className="text-lg text-slate-900">Nouvel ordre de maintenance</SheetTitle>
          <SheetDescription>Planification par le Directeur — FOR-MNT-02</SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-5 py-5">
          <div className="space-y-2">
            <FormFieldLabel icon={CalendarDays} htmlFor="plannedDate" required>
              Date d&apos;intervention prévue
            </FormFieldLabel>
            <Input
              id="plannedDate"
              name="plannedDate"
              type="date"
              required
              defaultValue={dateInputValue()}
              disabled={pending}
              className="h-10 rounded-lg border-slate-200"
            />
          </div>

          <div className="space-y-2">
            <FormFieldLabel icon={Wrench} required>
              Type d&apos;intervention
            </FormFieldLabel>
            <Select
              value={interventionType}
              onValueChange={(v) => setInterventionType(v as InterventionType)}
              disabled={pending}
            >
              <SelectTrigger className="h-10 rounded-lg border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(InterventionType).map((t) => (
                  <SelectItem key={t} value={t}>
                    {interventionTypeFr(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <FormFieldLabel icon={Settings2} required>
              Machines concernées
            </FormFieldLabel>
            <MachineMultiSelect
              machines={machines}
              selectedIds={selectedMachineIds}
              onSelectedIdsChange={setSelectedMachineIds}
              disabled={pending}
              placeholder="Rechercher par nom ou emplacement…"
            />
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <FormFieldLabel icon={ClipboardCheck}>Tâches requises</FormFieldLabel>
            <div className="grid gap-2 sm:grid-cols-2">
              <MaintenanceTaskCheckbox
                id="task-nettoyage"
                label="Nettoyage"
                checked={taskNettoyage}
                onChange={setTaskNettoyage}
                disabled={pending}
              />
              <MaintenanceTaskCheckbox
                id="task-graissage"
                label="Graissage"
                checked={taskGraissage}
                onChange={setTaskGraissage}
                disabled={pending}
              />
              <MaintenanceTaskCheckbox
                id="task-huile"
                label="Huile"
                checked={taskHuile}
                onChange={setTaskHuile}
                disabled={pending}
              />
              <MaintenanceTaskCheckbox
                id="task-control"
                label="Contrôle / C"
                hint="Conforme"
                checked={taskControl}
                onChange={setTaskControl}
                disabled={pending}
              />
              <MaintenanceTaskCheckbox
                id="task-nc"
                label="Non Conforme / N.C"
                hint="Autres défauts constatés"
                checked={taskNonConforme}
                onChange={setTaskNonConforme}
                disabled={pending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <FormFieldLabel icon={MessageSquareText} htmlFor="observationComment">
              Commentaire d&apos;observation
            </FormFieldLabel>
            <Textarea
              id="observationComment"
              name="observationComment"
              rows={3}
              disabled={pending}
              className="rounded-lg border-slate-200 resize-none"
              placeholder="Observations du Directeur avant intervention…"
            />
          </div>

          <div className="space-y-2">
            <FormFieldLabel icon={ShieldCheck} htmlFor="managerApproval">
              Approbation du Directeur
            </FormFieldLabel>
            <Input
              id="managerApproval"
              name="managerApproval"
              placeholder="Nom du directeur"
              disabled={pending}
              className="h-10 rounded-lg border-slate-200"
            />
          </div>

          {error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : null}

          <SheetFooter className="mt-auto border-t border-slate-100 pt-4 sm:flex-col">
            <Button
              type="submit"
              disabled={pending || selectedMachineIds.size === 0}
              className="h-11 w-full rounded-xl bg-[#1F76FB] text-base font-semibold hover:bg-[#1a65d6]"
            >
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
                  Création en cours…
                </>
              ) : (
                "Créer l'ordre"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
