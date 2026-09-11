"use client";

import { FileText, Loader2, Wrench } from "lucide-react";
import * as React from "react";

import { getMachineDetailAction } from "@/app/actions/machine";
import { MachineImageBlock } from "@/components/machines/machine-image-block";
import { MachineQrDialog } from "@/components/machines/machine-qr-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { operationTypeFr, maintenanceFrequencyFr } from "@/lib/view/gmao-labels";
import {
  machineAssetStatusFr,
  machineStatusBadgeClass,
} from "@/lib/view/machine-labels";
import { cn } from "@/lib/utils";

type DetailData = Extract<Awaited<ReturnType<typeof getMachineDetailAction>>, { ok: true }>["data"];

type MachineDetailSheetProps = {
  machineId: string | null;
  machineName: string;
  imageUrl?: string | null;
  qrCode: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MachineDetailSheet({
  machineId,
  machineName,
  imageUrl: initialImageUrl,
  qrCode,
  open,
  onOpenChange,
}: MachineDetailSheetProps) {
  const [loading, setLoading] = React.useState(false);
  const [detail, setDetail] = React.useState<DetailData | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !machineId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getMachineDetailAction(machineId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setError(res.error);
        setDetail(null);
        return;
      }
      setDetail(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [open, machineId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col overflow-y-auto border-slate-200 bg-white sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="pr-8 text-slate-900">{machineName}</SheetTitle>
          <SheetDescription className="text-slate-600">Profil équipement · historique & documents</SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="mt-4 space-y-6 pb-8">
            <MachineImageBlock imageUrl={initialImageUrl} alt={machineName} />
            <div className="flex flex-1 items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#1F76FB]" />
            </div>
          </div>
        ) : error ? (
          <p className="py-8 text-sm text-rose-600">{error}</p>
        ) : detail ? (
          <div className="mt-4 space-y-6 pb-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={cn("font-medium", machineStatusBadgeClass(detail.assetStatus))}>
                {machineAssetStatusFr(detail.assetStatus)}
              </Badge>
              <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                {maintenanceFrequencyFr(detail.maintenanceSector)}
              </Badge>
              {machineId ? (
                <MachineQrDialog machineId={machineId} machineName={machineName} initialQrCode={qrCode} />
              ) : null}
            </div>

            <MachineImageBlock
              imageUrl={detail.imageUrl ?? initialImageUrl}
              alt={machineName}
            />

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="text-xs font-semibold uppercase text-slate-500">Emplacement</p>
              <p className="mt-1 font-medium text-slate-900">{detail.location}</p>
              {detail.description ? (
                <>
                  <p className="mt-3 text-xs font-semibold uppercase text-slate-500">Description</p>
                  <p className="mt-1 text-slate-700">{detail.description}</p>
                </>
              ) : null}
            </div>

            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Wrench className="h-4 w-4 text-blue-600" />
                Historique des interventions
              </h3>
              {detail.maintenanceLogs.length === 0 ? (
                <p className="text-sm text-slate-600">Aucune intervention enregistrée.</p>
              ) : (
                <ol className="relative space-y-0 border-l-2 border-slate-200 pl-6">
                  {detail.maintenanceLogs.map((log, i) => (
                    <li key={log.id} className="relative pb-6 last:pb-0">
                      <span
                        className={cn(
                          "absolute -left-[1.6rem] top-1 h-3 w-3 rounded-full border-2 border-white",
                          i === 0 ? "bg-blue-600" : "bg-slate-300",
                        )}
                      />
                      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Badge variant="secondary" className="text-[10px] font-normal">
                            {operationTypeFr(log.operationType)}
                          </Badge>
                          <time className="text-[10px] text-slate-500">
                            {new Intl.DateTimeFormat("fr-FR", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            }).format(new Date(log.date))}
                          </time>
                        </div>
                        <p className="mt-2 text-xs text-slate-600">
                          {log.technician
                            ? `${log.technician.firstName} ${log.technician.lastName}`
                            : "Technicien non renseigné"}
                          {log.durationMinutes != null ? ` · ${log.durationMinutes} min` : ""}
                        </p>
                        <p className="mt-1 line-clamp-3 text-sm text-slate-800">{log.workPerformed}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {detail.spareParts.length > 0 ? (
              <section>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">Pièces liées</h3>
                <ul className="space-y-2">
                  {detail.spareParts.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <span className="text-slate-800">{p.designation}</span>
                      <span
                        className={cn(
                          "tabular-nums font-medium",
                          p.quantity <= p.minStock ? "text-rose-700" : "text-emerald-700",
                        )}
                      >
                        {p.quantity} / seuil {p.minStock}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {detail.manuals.length > 0 ? (
              <section>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FileText className="h-4 w-4" />
                  Documents
                </h3>
                <ul className="space-y-2">
                  {detail.manuals.map((doc) => (
                    <li key={doc.id}>
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonVariants({ variant: "outline", size: "sm", className: "w-full justify-start" })}
                      >
                        {doc.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
