"use client";

import { Loader2 } from "lucide-react";
import * as React from "react";

import { getTechnicianDetailAction } from "@/app/actions/technician";
import type { TechnicianDetailVm } from "@/lib/gmao/technician-detail-query";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatDateFrShort } from "@/lib/utils/format-date";
import { operationTypeFr, technicianAvailabilityFr, technicianRoleFr, technicianSpecialtyFr } from "@/lib/view/gmao-labels";
import { maintenanceWorkflowStatusFr } from "@/lib/view/machine-labels";
import { technicianAvailabilityBadgeClass } from "@/lib/view/status-badges";
import { cn } from "@/lib/utils";

type TechnicianDetailSheetProps = {
  technicianId: string | null;
  technicianName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TechnicianDetailSheet({
  technicianId,
  technicianName,
  open,
  onOpenChange,
}: TechnicianDetailSheetProps) {
  const [loading, setLoading] = React.useState(false);
  const [detail, setDetail] = React.useState<TechnicianDetailVm | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !technicianId) {
      setDetail(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getTechnicianDetailAction(technicianId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.ok) setDetail(res.data);
      else setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [open, technicianId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col border-slate-200 bg-white sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="text-slate-900">{technicianName}</SheetTitle>
          <SheetDescription className="text-slate-600">Profil RH · contact · historique interventions</SheetDescription>
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
                <Badge variant="secondary">{technicianSpecialtyFr(detail.specialty)}</Badge>
                <Badge variant="outline">{technicianRoleFr(detail.role)}</Badge>
                <Badge className={cn("font-medium", technicianAvailabilityBadgeClass(detail.availability))}>
                  {technicianAvailabilityFr(detail.availability)}
                </Badge>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                <p className="text-xs font-semibold uppercase text-slate-500">Contact</p>
                <p className="mt-1 text-slate-800">E-mail : {detail.email ?? "—"}</p>
                <p className="text-slate-800">Téléphone : {detail.phone ?? "—"}</p>
                <p className="text-slate-800">Matricule : {detail.employeeCode ?? "—"}</p>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                  Historique des interventions ({detail.interventionCount})
                </p>
                {detail.recentInterventions.length === 0 ? (
                  <p className="rounded-md border border-dashed border-slate-200 p-4 text-sm text-slate-600">
                    Aucune intervention enregistrée.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {detail.recentInterventions.map((log) => (
                      <li key={log.id} className="rounded-md border border-slate-100 bg-white px-3 py-2 text-sm">
                        <p className="font-medium text-slate-900">{log.machineName}</p>
                        <p className="text-xs text-slate-600">
                          {formatDateFrShort(log.date)} · {operationTypeFr(log.operationType)} ·{" "}
                          {maintenanceWorkflowStatusFr(log.workflowStatus)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                {detail.interventionCount > detail.recentInterventions.length ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Affichage des {detail.recentInterventions.length} dernières interventions.
                  </p>
                ) : null}
              </div>
            </div>
          </ScrollArea>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
