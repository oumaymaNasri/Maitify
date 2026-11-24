"use client";

import * as React from "react";

import type { MachineOption } from "@/components/preventive-planning/machine-combobox";
import { PreventivePlanForm, type PlanFormValues } from "@/components/preventive-planning/plan-form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { MaintenanceTypeOption } from "@/lib/preventive/catalog";

export type PlanDialogState =
  | { mode: "create"; machineId?: string }
  | { mode: "edit"; planId: string; initial: Partial<PlanFormValues> }
  | null;

/** Modal « Nouveau plan de maintenance préventive » : formulaire à gauche, prévisualisation à droite. */
export function PreventivePlanDialog({
  state,
  onOpenChange,
  onSaved,
  persistenceReady,
  canWrite,
  machines,
  technicians,
  maintenanceTypes,
}: {
  state: PlanDialogState;
  onOpenChange: (open: boolean) => void;
  onSaved: (id: string, warning?: string) => void;
  persistenceReady: boolean;
  canWrite: boolean;
  machines: MachineOption[];
  technicians: { id: string; label: string }[];
  maintenanceTypes: MaintenanceTypeOption[];
}) {
  const isEdit = state?.mode === "edit";
  return (
    <Dialog open={state !== null} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] max-w-[1200px] flex-col gap-3 overflow-hidden bg-slate-50 p-4 sm:p-5">
        <DialogHeader className="pr-8">
          <DialogTitle>{isEdit ? "Modifier le plan de maintenance préventive" : "Nouveau plan de maintenance préventive"}</DialogTitle>
          <DialogDescription>
            Définissez la machine, la fréquence et les règles de report ; les échéances sont recalculées en temps réel.
          </DialogDescription>
        </DialogHeader>
        {state ? (
          <PreventivePlanForm
            key={state.mode === "edit" ? state.planId : `new-${state.machineId ?? ""}`}
            layout="modal"
            mode={state.mode}
            planId={state.mode === "edit" ? state.planId : undefined}
            initial={state.mode === "edit" ? state.initial : state.machineId ? { machineId: state.machineId } : undefined}
            persistenceReady={persistenceReady}
            canWrite={canWrite}
            machines={machines}
            technicians={technicians}
            maintenanceTypes={maintenanceTypes}
            onCancel={() => onOpenChange(false)}
            onSaved={onSaved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
