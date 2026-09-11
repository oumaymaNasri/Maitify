"use client";

import { CalendarClock, Edit2, Eye, MapPin, Settings2, Trash2 } from "lucide-react";
import * as React from "react";

import { deleteMachineAction } from "@/app/actions/machine";
import { MachineQrDialog } from "@/components/machines/machine-qr-dialog";
import type { MachineCardVm } from "@/components/machines/machine-card";
import { MachineFormSheet } from "@/components/machines/machine-form-sheet";
import { DeleteConfirmDialog } from "@/components/gmao/premium/delete-confirm-dialog";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { maintenanceFrequencyFr } from "@/lib/view/gmao-labels";
import {
  formatLastIntervention,
  machineAssetStatusFr,
  machineStatusBadgeClass,
} from "@/lib/view/machine-labels";
import { machineImageApiUrl } from "@/lib/media/image-api";
import { cn } from "@/lib/utils";

type MachinePremiumCardProps = {
  machine: MachineCardVm;
  onView: (machine: MachineCardVm) => void;
  onDeleted?: () => void;
};

function MachinePremiumCardInner({ machine, onView, onDeleted }: MachinePremiumCardProps) {
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  return (
    <>
      <article
        className={cn(
          "group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-all duration-300",
          "hover:border-slate-300 hover:shadow-md",
        )}
      >
        <div className="relative aspect-[16/10] w-full bg-slate-100">
          {machine.hasCoverImage ? (
            <OptimizedImage
              src={machineImageApiUrl(machine.id)}
              alt={machine.name}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
              <Settings2 className="h-10 w-10 opacity-40" />
              <span className="text-xs">Aucune photo</span>
            </div>
          )}
          <div className="absolute left-2 top-2">
            <Badge className={cn("text-[11px] font-medium", machineStatusBadgeClass(machine.assetStatus))}>
              {machineAssetStatusFr(machine.assetStatus)}
            </Badge>
          </div>
          <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-blue-600"
              onClick={() => setEditOpen(true)}
              aria-label="Modifier"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 border border-slate-200 bg-white text-slate-500 hover:bg-rose-50 hover:text-rose-600"
              onClick={() => setDeleteOpen(true)}
              aria-label="Supprimer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div>
            <p className="font-mono text-[10px] text-slate-500">
              {machine.legacyMatricule != null ? `M${machine.legacyMatricule}` : machine.id.slice(0, 8)}
            </p>
            <h3 className="line-clamp-2 text-base font-semibold leading-tight text-slate-900">{machine.name}</h3>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-600">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-600" />
              <span className="truncate">{machine.location}</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">{maintenanceFrequencyFr(machine.maintenanceSector)}</p>
          </div>

          <p className="flex items-center gap-1.5 text-xs text-slate-600">
            <CalendarClock className="h-3.5 w-3.5" />
            {formatLastIntervention(machine.lastInterventionAt)}
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" size="sm" variant="outline" onClick={() => onView(machine)}>
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Profil
            </Button>
            <MachineQrDialog machineId={machine.id} machineName={machine.name} initialQrCode={machine.qrCode} />
          </div>
        </div>
      </article>

      <MachineFormSheet mode="edit" machine={machine} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Supprimer cette machine ?"
        description={`« ${machine.name} » sera définitivement retirée du parc.`}
        onConfirm={async () => {
          const res = await deleteMachineAction(machine.id);
          return { ok: res.ok, error: res.ok ? undefined : res.error };
        }}
        onSuccess={onDeleted}
      />
    </>
  );
}

export const MachinePremiumCard = React.memo(MachinePremiumCardInner);
