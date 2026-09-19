"use client";

import { Factory, MapPin } from "lucide-react";

import { DashboardCard } from "@/components/dashboard/premium/dashboard-card";
import { ButtonLink } from "@/components/ui/button";import type { FeaturedMachineVm } from "@/lib/gmao/dashboard-premium-data";
import { machineAssetStatusFr } from "@/lib/view/machine-labels";
import { machineStatusBadgeClass } from "@/lib/view/status-badges";
import { cn } from "@/lib/utils";
import type { MachineAssetStatus } from "@prisma/client";

function MachineVisual() {
  return (
    <div
      className="relative flex min-h-[200px] flex-1 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-[#E8F1FF]/60 lg:min-h-0 lg:min-w-[42%]"
      aria-hidden
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(31,118,251,0.12),transparent_65%)]" />
      <div className="absolute bottom-6 left-6 h-16 w-16 rounded-full border border-[#1F76FB]/20 bg-white/80 shadow-sm" />
      <div className="absolute right-8 top-8 h-10 w-10 rounded-full border border-[#1F76FB]/15 bg-[#1F76FB]/5" />
      <Factory className="relative z-10 h-24 w-24 text-[#1F76FB] md:h-28 md:w-28" strokeWidth={1.15} />
    </div>
  );
}

export function DashboardFeaturedMachine({ machine }: { machine: FeaturedMachineVm | null }) {
  if (!machine) {
    return (
      <DashboardCard className="flex min-h-[220px] flex-col items-center justify-center p-6 text-center lg:min-h-[280px]">
        <Factory className="h-16 w-16 text-[#1F76FB]/40" strokeWidth={1.25} aria-hidden />
        <p className="mt-4 text-sm text-slate-600">Aucune machine à mettre en avant.</p>
        <ButtonLink href="/donnees-de-base/machines" variant="outline" size="sm" className="mt-4">
          Voir le parc
        </ButtonLink>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard className="h-full overflow-hidden p-0">
      <div className="flex h-full flex-col lg:min-h-[280px] lg:flex-row">
        <div className="flex flex-1 flex-col p-5 lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#1F76FB]">Équipement phare</p>
            <h2 className="mt-1 text-xl font-bold leading-tight text-slate-900 md:text-2xl">{machine.name}</h2>
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-600">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[#1F76FB]" />
              {machine.location}
            </p>
            <span
              className={cn(
                "mt-2 inline-flex rounded-md border px-2 py-0.5 text-[10px] font-medium",
                machineStatusBadgeClass(machine.assetStatus as MachineAssetStatus),
              )}
            >
              {machineAssetStatusFr(machine.assetStatus as MachineAssetStatus)}
            </span>
          </div>

          <dl className="mt-4 space-y-0 border-t border-slate-100 pt-3">
            {machine.specs.map((spec) => (
              <div
                key={spec.label}
                className="flex items-baseline justify-between gap-3 border-b border-slate-50 py-2 last:border-0"
              >
                <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{spec.label}</dt>
                <dd className="text-right text-sm font-semibold text-slate-900">{spec.value}</dd>
              </div>
            ))}
          </dl>

          <ButtonLink href="/donnees-de-base/machines" size="sm" className="mt-4 hidden w-full bg-[#1F76FB] hover:bg-[#1865D9] lg:flex">
            Voir la fiche machine
          </ButtonLink>
        </div>

        <MachineVisual />

        <div className="border-t border-slate-100 p-4 lg:hidden">
          <ButtonLink href="/donnees-de-base/machines" className="w-full bg-[#1F76FB] hover:bg-[#1865D9]">
            Voir la fiche machine
          </ButtonLink>
        </div>
      </div>
    </DashboardCard>
  );
}
