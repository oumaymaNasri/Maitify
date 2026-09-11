"use client";

import { MaintenanceWorkflowStatus, OperationType } from "@prisma/client";
import { Loader2, Pencil } from "lucide-react";
import * as React from "react";

import { getMaintenanceLogDetailAction, updateMaintenanceLogAction } from "@/app/actions/maintenance-log";
import type { InterventionListVm } from "@/components/interventions/intervention-types";
import type { MachineOption, TechnicianOption } from "@/components/interventions/InterventionIntelligentForm";
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
import { Textarea } from "@/components/ui/textarea";
import { operationTypeFr } from "@/lib/view/gmao-labels";
import { maintenanceWorkflowStatusFr } from "@/lib/view/machine-labels";

type InterventionEditDialogProps = {
  intervention: InterventionListVm | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  machines: MachineOption[];
  technicians: TechnicianOption[];
  onUpdated: (row: InterventionListVm) => void;
};

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function InterventionEditDialog({
  intervention,
  open,
  onOpenChange,
  machines,
  technicians,
  onUpdated,
}: InterventionEditDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [machineId, setMachineId] = React.useState("");
  const [technicianId, setTechnicianId] = React.useState("");
  const [operationType, setOperationType] = React.useState<OperationType>(OperationType.DIAGNOSTIC);
  const [workflowStatus, setWorkflowStatus] = React.useState<MaintenanceWorkflowStatus>(
    MaintenanceWorkflowStatus.COMPLETED,
  );
  const [date, setDate] = React.useState("");
  const [durationMinutes, setDurationMinutes] = React.useState("");
  const [failureCause, setFailureCause] = React.useState("");
  const [sectorMaintenance, setSectorMaintenance] = React.useState("");
  const [service, setService] = React.useState("");
  const [operation, setOperation] = React.useState("");
  const [failureDescription, setFailureDescription] = React.useState("");
  const [workPerformed, setWorkPerformed] = React.useState("");
  const [difficulties, setDifficulties] = React.useState("");

  React.useEffect(() => {
    if (!open || !intervention) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getMaintenanceLogDetailAction(intervention.id).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const d = res.data;
      setMachineId(d.machine.id);
      setTechnicianId(d.technician?.id ?? "");
      setOperationType(d.operationType);
      setWorkflowStatus(d.workflowStatus);
      setDate(toDatetimeLocal(d.date));
      setDurationMinutes(d.durationMinutes != null ? String(d.durationMinutes) : "");
      setFailureCause(d.failureCause ?? "");
      setSectorMaintenance(d.sectorMaintenance ?? "");
      setService(d.service ?? "");
      setOperation(d.operation ?? "");
      setFailureDescription(d.failureDescription ?? "");
      setWorkPerformed(d.workPerformed);
      setDifficulties(d.difficulties ?? "");
    });
    return () => {
      cancelled = true;
    };
  }, [open, intervention]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intervention) return;
    setPending(true);
    setError(null);

    const fd = new FormData();
    fd.set("id", intervention.id);
    fd.set("machineId", machineId);
    fd.set("technicianId", technicianId);
    fd.set("operationType", operationType);
    fd.set("workflowStatus", workflowStatus);
    fd.set("date", date);
    fd.set("durationMinutes", durationMinutes);
    fd.set("failureCause", failureCause);
    fd.set("sectorMaintenance", sectorMaintenance);
    fd.set("service", service);
    fd.set("operation", operation);
    fd.set("failureDescription", failureDescription);
    fd.set("workPerformed", workPerformed);
    fd.set("difficulties", difficulties);

    const res = await updateMaintenanceLogAction(fd);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }

    const machine = machines.find((m) => m.id === machineId);
    const tech = technicians.find((t) => t.id === technicianId);
    onUpdated({
      ...intervention,
      machineId,
      machineName: machine?.name ?? intervention.machineName,
      technicianId: technicianId || null,
      technicianName: tech?.label ?? null,
      operationType,
      workflowStatus,
      date: new Date(date).toISOString(),
      durationMinutes: durationMinutes.trim() ? Math.max(0, Number(durationMinutes)) : null,
      failureDescription: failureDescription.trim() || null,
      workPerformed,
      operation: operation.trim() || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-slate-200 bg-white sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <Pencil className="h-5 w-5 text-[#1F76FB]" />
            Modifier l&apos;intervention
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            {intervention ? `${intervention.machineName}` : ""}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#1F76FB]" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Machine *</Label>
              <select
                required
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="" disabled>
                  Sélectionner…
                </option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Technicien *</Label>
              <select
                required
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="" disabled>
                  Sélectionner…
                </option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Type d&apos;opération</Label>
              <select
                value={operationType}
                onChange={(e) => setOperationType(e.target.value as OperationType)}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                {Object.values(OperationType).map((op) => (
                  <option key={op} value={op}>
                    {operationTypeFr(op)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <select
                value={workflowStatus}
                onChange={(e) => setWorkflowStatus(e.target.value as MaintenanceWorkflowStatus)}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                {Object.values(MaintenanceWorkflowStatus).map((s) => (
                  <option key={s} value={s}>
                    {maintenanceWorkflowStatusFr(s)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Date / heure</Label>
              <Input type="datetime-local" required value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Durée (min)</Label>
              <Input type="number" min={0} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Cause de défaillance</Label>
              <select
                value={failureCause}
                onChange={(e) => setFailureCause(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="">—</option>
                <option value="USURE_NORMALE">Usure normale</option>
                <option value="DEFAUT_UTILISATEUR">Défaut utilisateur</option>
                <option value="DEFAUT_PRODUIT">Défaut produit</option>
                <option value="AUTRE">Autre</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Secteur maintenance</Label>
              <Input value={sectorMaintenance} onChange={(e) => setSectorMaintenance(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Service</Label>
              <Input value={service} onChange={(e) => setService(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Opération (libellé)</Label>
              <Input value={operation} onChange={(e) => setOperation(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Dysfonctionnement</Label>
              <Textarea rows={2} value={failureDescription} onChange={(e) => setFailureDescription(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Travaux réalisés *</Label>
              <Textarea rows={4} required value={workPerformed} onChange={(e) => setWorkPerformed(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Difficultés</Label>
              <Textarea rows={2} value={difficulties} onChange={(e) => setDifficulties(e.target.value)} />
            </div>

            {error ? <p className="sm:col-span-2 text-sm text-rose-600">{error}</p> : null}

            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                Annuler
              </Button>
              <Button type="submit" disabled={pending} className="bg-[#1F76FB] hover:bg-[#1a65d6]">
                {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
