"use client";

import { CalendarClock, MapPin, Settings2 } from "lucide-react";

import { MachineQrDialog } from "@/components/machines/machine-qr-dialog";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { machineImageApiUrl } from "@/lib/media/image-api";
import { cn } from "@/lib/utils";
import {
  formatLastIntervention,
  machineAssetStatusFr,
  machineStatusBadgeClass,
} from "@/lib/view/machine-labels";
import type { MachineAssetStatus, MaintenanceFrequency } from "@prisma/client";
import { maintenanceFrequencyFr } from "@/lib/view/gmao-labels";

export type MachineCardVm = {
  id: string;
  name: string;
  location: string;
  legacyMatricule: number | null;
  targetAvailability: number | null;
  assetStatus: MachineAssetStatus;
  maintenanceSector: MaintenanceFrequency;
  /** Indique qu'une image est disponible via `/api/machines/[id]/image`. */
  hasCoverImage: boolean;
  /** URL légère ou data-URL — uniquement en édition / détail, absent des listes. */
  imageUrl?: string | null;
  coverImageUrl?: string | null;
  interventionCount: number;
  galleryCount: number;
  qrCode: string | null;
  description?: string | null;
  lastInterventionAt: string | null;
};

export function MachineCard({ machine, className }: { machine: MachineCardVm; className?: string }) {
  return (
    <Card
      className={cn(
        "group overflow-hidden border-border/80 pt-0 transition-all hover:border-primary/30 hover:shadow-md",
        className,
      )}
    >
      <div className="relative aspect-[16/10] w-full bg-muted">
        {machine.hasCoverImage ? (
          <OptimizedImage
            src={machineImageApiUrl(machine.id)}
            alt={machine.name}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div
            className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-100 text-slate-600"
            aria-hidden
          >
            <Settings2 className="h-10 w-10 opacity-25" />
            <span className="text-xs font-medium">Aucune photo</span>
          </div>
        )}
        <div className="absolute left-2 top-2">
          <Badge className={cn("text-[11px] font-semibold", machineStatusBadgeClass(machine.assetStatus))}>
            {machineAssetStatusFr(machine.assetStatus)}
          </Badge>
        </div>
      </div>

      <CardContent className="space-y-3 p-4">
        <div>
          <h3 className="line-clamp-2 text-base font-semibold leading-tight tracking-tight">{machine.name}</h3>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/80" aria-hidden />
            <span className="truncate font-medium text-foreground/90">{machine.location}</span>
          </p>
          {machine.maintenanceSector ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Secteur : {maintenanceFrequencyFr(machine.maintenanceSector)}
            </p>
          ) : null}
        </div>

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            Dernière intervention :{" "}
            <span className="font-medium text-foreground">{formatLastIntervention(machine.lastInterventionAt)}</span>
          </span>
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          <MachineQrDialog machineId={machine.id} machineName={machine.name} initialQrCode={machine.qrCode} />
          <Dialog>
            <DialogTrigger type="button" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Détails
            </DialogTrigger>
            <DialogContent className="max-h-[85dvh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{machine.name}</DialogTitle>
                <DialogDescription className="flex flex-wrap gap-2 pt-2">
                  <Badge className={machineStatusBadgeClass(machine.assetStatus)}>
                    {machineAssetStatusFr(machine.assetStatus)}
                  </Badge>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Emplacement</p>
                  <p className="mt-0.5">{machine.location}</p>
                </div>
                {machine.maintenanceSector ? (
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Secteur maintenance</p>
                    <p className="mt-0.5">{maintenanceFrequencyFr(machine.maintenanceSector)}</p>
                  </div>
                ) : null}
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Dernière intervention</p>
                  <p className="mt-0.5">{formatLastIntervention(machine.lastInterventionAt)}</p>
                </div>
                <Separator />
                <p className="text-xs text-muted-foreground">
                  {machine.interventionCount} intervention(s) · {machine.galleryCount} média(s)
                </p>
              </div>
              <DialogFooter>
                <p className="w-full text-left text-[11px] text-muted-foreground">ID : {machine.id}</p>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
