"use client";

import { Loader2 } from "lucide-react";
import * as React from "react";

import { getMaintenanceOrderDetailAction } from "@/app/actions/maintenance-order";
import { MaintenanceOrderPdfButton } from "@/components/maintenance-orders/maintenance-order-pdf-button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { MaintenanceOrderDetailVm } from "@/lib/gmao/maintenance-order-detail-query";
import { formatDateFrShort } from "@/lib/utils/format-date";
import { maintenanceOrderStatusFr } from "@/lib/view/gmao-labels";
import { interventionTypeFr } from "@/lib/view/labels";
import { cn } from "@/lib/utils";

type MaintenanceOrderDetailSheetProps = {
  orderId: string | null;
  orderReference: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function taskBadge(label: string, active: boolean) {
  return (
    <Badge variant={active ? "default" : "outline"} className={cn("text-xs", !active && "text-slate-400")}>
      {label}: {active ? "OUI" : "NON"}
    </Badge>
  );
}

export function MaintenanceOrderDetailSheet({
  orderId,
  orderReference,
  open,
  onOpenChange,
}: MaintenanceOrderDetailSheetProps) {
  const [loading, setLoading] = React.useState(false);
  const [detail, setDetail] = React.useState<MaintenanceOrderDetailVm | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !orderId) {
      setDetail(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getMaintenanceOrderDetailAction(orderId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.ok) setDetail(res.data);
      else setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [open, orderId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col border-slate-200 bg-white sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="text-slate-900">{orderReference || "Ordre de maintenance"}</SheetTitle>
          <SheetDescription className="text-slate-600">FOR-MNT-02 · planification Directeur</SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#1F76FB]" />
          </div>
        ) : error ? (
          <p className="text-sm text-rose-600">{error}</p>
        ) : detail ? (
          <ScrollArea className="flex-1 pr-3">
            <div className="space-y-5 pb-8">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{interventionTypeFr(detail.interventionType)}</Badge>
                <Badge variant="outline">{maintenanceOrderStatusFr(detail.status)}</Badge>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                <p>
                  <span className="font-medium">Date prévue :</span> {formatDateFrShort(detail.plannedDate)}
                </p>
                <p className="mt-1">
                  <span className="font-medium">Référence :</span> {detail.reference}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Machines & tâches</p>
                <div className="space-y-3">
                  {detail.lines.map((line) => (
                    <div key={line.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-slate-900">{line.machineName}</p>
                          <p className="text-xs text-slate-500">{line.machineLocation}</p>
                        </div>
                        {line.completed ? (
                          <Badge className="bg-emerald-50 text-emerald-700">Exécuté</Badge>
                        ) : (
                          <Badge variant="outline">En attente</Badge>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {taskBadge("Nettoyage", line.taskNettoyage)}
                        {taskBadge("Graissage", line.taskGraissage)}
                        {taskBadge("Huile", line.taskHuile)}
                        {taskBadge("C", line.taskControl)}
                        {taskBadge("N.C", line.taskNonConforme)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {detail.observationComment ? (
                <div className="rounded-lg border border-slate-200 p-4 text-sm">
                  <p className="text-xs font-semibold uppercase text-slate-500">Commentaire d&apos;observation</p>
                  <p className="mt-2 whitespace-pre-wrap text-slate-700">{detail.observationComment}</p>
                </div>
              ) : null}

              {detail.managerApproval ? (
                <div className="rounded-lg border border-slate-200 p-4 text-sm">
                  <p className="text-xs font-semibold uppercase text-slate-500">Approbation du Directeur</p>
                  <p className="mt-2 text-slate-700">{detail.managerApproval}</p>
                </div>
              ) : null}

              <MaintenanceOrderPdfButton orderId={detail.id} reference={detail.reference} />
            </div>
          </ScrollArea>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
