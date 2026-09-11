"use client";

import { InterventionType, MaintenanceOrderStatus } from "@prisma/client";
import { Loader2 } from "lucide-react";
import * as React from "react";

import { getMaintenanceOrderDetailAction, updateMaintenanceOrderAction } from "@/app/actions/maintenance-order";
import {
  MaintenanceTaskCheckbox,
  MachineMultiSelect,
  type MachineMultiSelectOption,
} from "@/components/maintenance-orders/maintenance-order-form-fields";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MaintenanceOrderRow } from "@/lib/gmao/maintenance-orders-query";
import { maintenanceOrderStatusFr } from "@/lib/view/gmao-labels";
import { interventionTypeFr } from "@/lib/view/labels";

type MaintenanceOrderEditDialogProps = {
  order: MaintenanceOrderRow | null;
  machines: MachineMultiSelectOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (order: MaintenanceOrderRow) => void;
};

function dateInputFromIso(iso: string): string {
  const d = new Date(iso);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function MaintenanceOrderEditDialog({
  order,
  machines,
  open,
  onOpenChange,
  onUpdated,
}: MaintenanceOrderEditDialogProps) {
  const [pending, setPending] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [plannedDate, setPlannedDate] = React.useState("");
  const [interventionType, setInterventionType] = React.useState<InterventionType>(InterventionType.PREVENTIVE);
  const [status, setStatus] = React.useState<MaintenanceOrderStatus>(MaintenanceOrderStatus.ACTIVE);
  const [observationComment, setObservationComment] = React.useState("");
  const [managerApproval, setManagerApproval] = React.useState("");
  const [selectedMachineIds, setSelectedMachineIds] = React.useState<Set<string>>(new Set());
  const [completedMachineIds, setCompletedMachineIds] = React.useState<Set<string>>(new Set());
  const [taskNettoyage, setTaskNettoyage] = React.useState(false);
  const [taskGraissage, setTaskGraissage] = React.useState(false);
  const [taskHuile, setTaskHuile] = React.useState(false);
  const [taskControl, setTaskControl] = React.useState(false);
  const [taskNonConforme, setTaskNonConforme] = React.useState(false);

  React.useEffect(() => {
    if (!open || !order) return;
    setLoading(true);
    setError(null);
    void getMaintenanceOrderDetailAction(order.id).then((res) => {
      setLoading(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const d = res.data;
      setPlannedDate(dateInputFromIso(d.plannedDate));
      setInterventionType(d.interventionType);
      setStatus(d.status);
      setObservationComment(d.observationComment ?? "");
      setManagerApproval(d.managerApproval ?? "");
      setSelectedMachineIds(new Set(d.lines.map((l) => l.machineId)));
      setCompletedMachineIds(new Set(d.lines.filter((l) => l.completed).map((l) => l.machineId)));
      const firstPending = d.lines.find((l) => !l.completed);
      if (firstPending) {
        setTaskNettoyage(firstPending.taskNettoyage);
        setTaskGraissage(firstPending.taskGraissage);
        setTaskHuile(firstPending.taskHuile);
        setTaskControl(firstPending.taskControl);
        setTaskNonConforme(firstPending.taskNonConforme);
      }
    });
  }, [open, order]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setPending(true);
    setError(null);

    const fd = new FormData();
    fd.set("id", order.id);
    fd.set("plannedDate", plannedDate);
    fd.set("interventionType", interventionType);
    fd.set("status", status);
    fd.set("observationComment", observationComment);
    fd.set("managerApproval", managerApproval);
    fd.set(
      "machineIds",
      Array.from(new Set([...Array.from(selectedMachineIds), ...Array.from(completedMachineIds)])).join(","),
    );
    fd.set("taskNettoyage", String(taskNettoyage));
    fd.set("taskGraissage", String(taskGraissage));
    fd.set("taskHuile", String(taskHuile));
    fd.set("taskControl", String(taskControl));
    fd.set("taskNonConforme", String(taskNonConforme));

    const res = await updateMaintenanceOrderAction(fd);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const machineNames = machines.filter((m) => selectedMachineIds.has(m.id) || completedMachineIds.has(m.id)).map((m) => m.name).join(", ");
    onUpdated?.({
      ...order,
      plannedDate: new Date(plannedDate).toISOString(),
      interventionType,
      status,
      observationComment: observationComment.trim() || null,
      managerApproval: managerApproval.trim() || null,
      machineNames,
      machineCount: new Set([...Array.from(selectedMachineIds), ...Array.from(completedMachineIds)]).size,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier l&apos;ordre</DialogTitle>
          <DialogDescription>{order?.reference}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#1F76FB]" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-plannedDate">Date d&apos;intervention prévue</Label>
              <Input id="edit-plannedDate" type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} required disabled={pending} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={interventionType} onValueChange={(v) => setInterventionType(v as InterventionType)} disabled={pending}>
                  <SelectTrigger>
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
                <Label>Statut</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as MaintenanceOrderStatus)} disabled={pending}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(MaintenanceOrderStatus).map((s) => (
                      <SelectItem key={s} value={s}>
                        {maintenanceOrderStatusFr(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Machines</Label>
              <MachineMultiSelect
                machines={machines}
                selectedIds={new Set([...Array.from(selectedMachineIds), ...Array.from(completedMachineIds)])}
                lockedIds={completedMachineIds}
                onSelectedIdsChange={(ids) => {
                  const next = new Set(ids);
                  for (const id of Array.from(completedMachineIds)) next.add(id);
                  setSelectedMachineIds(new Set(Array.from(next).filter((id) => !completedMachineIds.has(id))));
                }}
                disabled={pending}
              />
            </div>

            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <p className="text-sm font-medium text-slate-800">Tâches requises</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <MaintenanceTaskCheckbox id="edit-nettoyage" label="Nettoyage" checked={taskNettoyage} onChange={setTaskNettoyage} disabled={pending} />
                <MaintenanceTaskCheckbox id="edit-graissage" label="Graissage" checked={taskGraissage} onChange={setTaskGraissage} disabled={pending} />
                <MaintenanceTaskCheckbox id="edit-huile" label="Huile" checked={taskHuile} onChange={setTaskHuile} disabled={pending} />
                <MaintenanceTaskCheckbox id="edit-control" label="Contrôle / C" hint="Conforme" checked={taskControl} onChange={setTaskControl} disabled={pending} />
                <MaintenanceTaskCheckbox id="edit-nc" label="Non Conforme / N.C" hint="Autres défauts constatés" checked={taskNonConforme} onChange={setTaskNonConforme} disabled={pending} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Commentaire d&apos;observation</Label>
              <Textarea value={observationComment} onChange={(e) => setObservationComment(e.target.value)} rows={3} disabled={pending} />
            </div>

            <div className="space-y-2">
              <Label>Approbation du Directeur</Label>
              <Input value={managerApproval} onChange={(e) => setManagerApproval(e.target.value)} disabled={pending} />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <DialogFooter>
              <Button type="submit" disabled={pending || selectedMachineIds.size === 0}>
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
