"use client";

import type { TechnicianAvailability } from "@prisma/client";

import { updateTechnicianAvailabilityAction } from "@/app/actions/technician";
import { GmaoModuleShell } from "@/components/gmao/premium/module-shell";
import { AddTechnicianSheet } from "@/components/technicians/add-technician-sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TechnicianRow } from "@/lib/gmao/technicians-query";
import {
  technicianAvailabilityFr,
  technicianRoleFr,
  technicianSpecialtyFr,
} from "@/lib/view/gmao-labels";
import { technicianAvailabilityBadgeClass } from "@/lib/view/status-badges";
import { cn } from "@/lib/utils";

export function TechniciansGrid({ technicians }: { technicians: TechnicianRow[] }) {
  return (
    <GmaoModuleShell
      title="Techniciens & RH"
      subtitle="Gestion des profils, spécialités et disponibilité atelier."
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{technicians.length}</span> technicien(s)
        </p>
        <AddTechnicianSheet />
      </div>

      {!technicians.length ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-600">
          Aucun technicien — ajoutez le premier profil.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {technicians.map((t) => (
            <li key={t.id}>
              <Card className="border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md">
                <CardContent className="flex gap-3 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                    {t.firstName[0]}
                    {t.lastName[0]}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      <p className="truncate font-semibold text-slate-900">
                        {t.firstName} {t.lastName}
                      </p>
                      <p className="truncate text-xs text-slate-600">
                        {t.employeeCode ? `Mat. ${t.employeeCode}` : t.email ?? "—"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="border-slate-200 bg-slate-50 text-slate-700">
                        {technicianSpecialtyFr(t.specialty)}
                      </Badge>
                      <Badge variant="outline" className="border-slate-200 text-slate-700">
                        {technicianRoleFr(t.role)}
                      </Badge>
                      <Badge className={cn("border", technicianAvailabilityBadgeClass(t.availability))}>
                        {technicianAvailabilityFr(t.availability)}
                      </Badge>
                    </div>
                    <Select
                      value={t.availability}
                      onValueChange={async (v) => {
                        await updateTechnicianAvailabilityAction(t.id, v as TechnicianAvailability);
                      }}
                    >
                      <SelectTrigger className="h-8 border-slate-200 text-xs">
                        <SelectValue placeholder="Changer statut" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DISPONIBLE">Disponible</SelectItem>
                        <SelectItem value="EN_INTERVENTION">En intervention</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-600">{t.interventionCount} intervention(s)</p>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </GmaoModuleShell>
  );
}
