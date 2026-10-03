"use client";

import { Loader2, RotateCcw } from "lucide-react";
import * as React from "react";

import { getMaintenanceOrderDetailAction } from "@/app/actions/maintenance-order";
import { MaintenanceOrderPdfButton } from "@/components/maintenance-orders/maintenance-order-pdf-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { MaintenanceOrderDetailVm } from "@/lib/gmao/maintenance-order-detail-query";
import { formatDateFrShort, formatDurationMinutes } from "@/lib/utils/format-date";
import { maintenanceOrderStatusFr } from "@/lib/view/gmao-labels";
import { interventionTypeFr } from "@/lib/view/labels";
import { maintenanceWorkflowStatusFr } from "@/lib/view/machine-labels";
import { cn } from "@/lib/utils";

type MaintenanceOrderDetailSheetProps = {
  orderId: string | null;
  orderReference: string;
  orderStatus?: string;
  canReopen?: boolean;
  reopenPending?: boolean;
  onReopen?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function taskMarkCell(active: boolean) {
  return (
    <span className={cn("font-semibold tabular-nums", active ? "text-emerald-700" : "text-slate-300")}>
      {active ? "X" : "—"}
    </span>
  );
}

function InterventionLogsSection({
  title,
  empty,
  logs,
}: {
  title: string;
  empty: string;
  logs: MaintenanceOrderDetailVm["logs"];
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase text-slate-500">{title}</p>
      {logs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500">{empty}</p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="rounded-lg border border-slate-200 p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">{log.machineName}</p>
                  <p className="text-xs text-slate-500">{log.machineLocation}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  <Badge variant="secondary">{interventionTypeFr(log.type)}</Badge>
                  <Badge variant="outline">{maintenanceWorkflowStatusFr(log.workflowStatus)}</Badge>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-600">
                Technicien : {log.technicianName ?? "—"} · Temps : {formatDurationMinutes(log.durationMinutes, log.durationUnit)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MaintenanceOrderDetailSheet({
  orderId,
  orderReference,
  orderStatus,
  canReopen,
  reopenPending,
  onReopen,
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
          <SheetTitle className="text-slate-900">{orderReference || "Ordre de maintenance journalier"}</SheetTitle>
          <SheetDescription className="text-slate-600">Bon de travail du jour — FOR-MNT-02</SheetDescription>
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
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Ordre journalier</Badge>
                <Badge variant="outline">
                  {maintenanceOrderStatusFr((orderStatus ?? detail.status) as "ACTIVE" | "COMPLETED" | "CANCELLED")}
                </Badge>
                <Badge variant="outline">{detail.preventiveCount} préventive(s)</Badge>
                <Badge variant="outline">{detail.correctiveCount} corrective(s)</Badge>
              </div>

              {canReopen && onReopen ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={reopenPending}
                  onClick={onReopen}
                  className="rounded-xl border-amber-200 text-amber-800 hover:bg-amber-50"
                >
                  {reopenPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                  Réouvrir l&apos;ordre de maintenance
                </Button>
              ) : null}

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                <p>
                  <span className="font-medium">Date prévue :</span> {formatDateFrShort(detail.plannedDate)}
                </p>
                <p className="mt-1">
                  <span className="font-medium">Référence :</span> {detail.reference}
                </p>
              </div>

              {detail.lines.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Plan préventif (machines & tâches)</p>
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full min-w-[520px] border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <th className="px-3 py-2">Machine</th>
                          <th className="px-2 py-2 text-center">Nettoyage</th>
                          <th className="px-2 py-2 text-center">Graissage</th>
                          <th className="px-2 py-2 text-center">Huile</th>
                          <th className="px-2 py-2 text-center" title="Conforme">
                            C
                          </th>
                          <th className="px-2 py-2 text-center" title="Non conforme">
                            N.C
                          </th>
                          <th className="px-3 py-2 text-right">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.lines.map((line) => (
                          <tr key={line.id} className="border-t border-slate-100">
                            <td className="px-3 py-2">
                              <p className="font-medium text-slate-900">{line.machineName}</p>
                              <p className="text-xs text-slate-500">{line.machineLocation}</p>
                            </td>
                            <td className="px-2 py-2 text-center">{taskMarkCell(line.taskNettoyage)}</td>
                            <td className="px-2 py-2 text-center">{taskMarkCell(line.taskGraissage)}</td>
                            <td className="px-2 py-2 text-center">{taskMarkCell(line.taskHuile)}</td>
                            <td className="px-2 py-2 text-center">{taskMarkCell(line.taskControl)}</td>
                            <td className="px-2 py-2 text-center">{taskMarkCell(line.taskNonConforme)}</td>
                            <td className="px-3 py-2 text-right">
                              {line.completed ? (
                                <Badge className="bg-emerald-50 text-emerald-700">Exécuté</Badge>
                              ) : (
                                <Badge variant="outline">En attente</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              <InterventionLogsSection
                title="Maintenances préventives du jour"
                empty="Aucune maintenance préventive rattachée à cette date."
                logs={detail.logs.filter((l) => l.type === "PREVENTIVE")}
              />
              <InterventionLogsSection
                title="Maintenances correctives du jour"
                empty="Aucune maintenance corrective rattachée à cette date."
                logs={detail.logs.filter((l) => l.type !== "PREVENTIVE")}
              />

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
