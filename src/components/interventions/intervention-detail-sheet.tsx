"use client";

import { Loader2 } from "lucide-react";
import * as React from "react";

import { getMaintenanceLogDetailAction } from "@/app/actions/maintenance-log";
import type { InterventionDetailVm } from "@/components/interventions/intervention-types";
import { InterventionFicheButton } from "@/components/interventions/intervention-fiche-button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatDateFrLongWithTime } from "@/lib/utils/format-date";
import { failureCauseFr, operationTypeFr } from "@/lib/view/gmao-labels";
import { interventionTypeFr } from "@/lib/view/labels";
import { maintenanceWorkflowStatusFr } from "@/lib/view/machine-labels";

type InterventionDetailSheetProps = {
  interventionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function InterventionDetailSheet({ interventionId, open, onOpenChange }: InterventionDetailSheetProps) {
  const [loading, setLoading] = React.useState(false);
  const [detail, setDetail] = React.useState<InterventionDetailVm | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !interventionId) {
      setDetail(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getMaintenanceLogDetailAction(interventionId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.ok) setDetail(res.data);
      else setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [open, interventionId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col border-slate-200 bg-white sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="text-slate-900">Détail intervention</SheetTitle>
          <SheetDescription>
            {detail ? `${detail.machine.name} · ${detail.machine.location}` : "Chargement…"}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#1F76FB]" />
          </div>
        ) : error ? (
          <p className="text-sm text-rose-600">{error}</p>
        ) : detail ? (
          <ScrollArea className="flex-1 pr-3">
            <div className="space-y-4 pb-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{operationTypeFr(detail.operationType)}</Badge>
                <Badge variant={detail.workflowStatus === "OPEN" ? "warning" : "outline"}>
                  {maintenanceWorkflowStatusFr(detail.workflowStatus)}
                </Badge>
                <Badge variant="outline">{interventionTypeFr(detail.type)}</Badge>
              </div>

              <DetailBlock label="Date" value={formatDateFrLongWithTime(detail.date)} />
              <DetailBlock
                label="Technicien"
                value={
                  detail.technician
                    ? `${detail.technician.firstName} ${detail.technician.lastName}`
                    : "—"
                }
              />
              <DetailBlock label="Secteur maintenance" value={detail.sectorMaintenance} />
              <DetailBlock label="Dysfonctionnement" value={detail.failureDescription} multiline />
              <DetailBlock label="Travaux réalisés" value={detail.workPerformed} multiline />
              <DetailBlock label="Difficultés" value={detail.difficulties} multiline />
              <DetailBlock
                label="Cause"
                value={detail.failureCause ? failureCauseFr(detail.failureCause) : null}
              />
              <DetailBlock
                label="Temps d'intervention"
                value={detail.durationMinutes != null ? `${detail.durationMinutes} min` : null}
              />

              {detail.sparePartLines.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Pièces consommées</p>
                  <ul className="space-y-1 text-sm text-slate-700">
                    {detail.sparePartLines.map((p, i) => (
                      <li key={i} className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                        {p.designation}
                        {p.reference ? ` · ${p.reference}` : ""} — ×{p.quantityUsed}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {detail.signature?.startsWith("data:image") ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Signature</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={detail.signature}
                    alt="Signature"
                    className="max-h-24 rounded-md border border-slate-200 object-contain"
                  />
                </div>
              ) : null}

              <InterventionFicheButton interventionId={detail.id} className="w-full" />
            </div>
          </ScrollArea>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function DetailBlock({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string | null | undefined;
  multiline?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={multiline ? "mt-1 whitespace-pre-wrap text-sm text-slate-800" : "mt-0.5 text-sm text-slate-800"}>
        {value?.trim() ? value : "—"}
      </p>
    </div>
  );
}
