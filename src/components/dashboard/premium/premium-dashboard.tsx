"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import * as React from "react";

import { DashboardCard } from "@/components/dashboard/premium/dashboard-card";
import { DashboardFeaturedMachine } from "@/components/dashboard/premium/dashboard-featured-machine";
import { DashboardMttrGrid } from "@/components/dashboard/premium/dashboard-mttr-grid";
import { DashboardRadialGauge } from "@/components/dashboard/premium/dashboard-radial-progress";
import { DashboardSparkline } from "@/components/dashboard/premium/dashboard-sparkline";
import { DashboardPremiumChrome } from "@/components/dashboard/premium/dashboard-premium-chrome";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { PremiumDashboardPayload } from "@/lib/gmao/dashboard-premium-data";
import { cn } from "@/lib/utils";

const PremiumDashboardOmChart = dynamic(
  () =>
    import("@/components/dashboard/premium/premium-dashboard-om-chart").then((m) => ({
      default: m.PremiumDashboardOmChart,
    })),
  {
    loading: () => <Skeleton className="h-[280px] w-full rounded-xl bg-slate-100" />,
    ssr: false,
  },
);

function AlertRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm",
        highlight ? "bg-[#1F76FB] font-medium text-white" : "bg-slate-50 text-slate-700",
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        {highlight ? <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
        <span className="truncate">{label}</span>
      </span>
      <span className={cn("shrink-0 tabular-nums", highlight ? "text-white" : "text-slate-900")}>{value}</span>
    </div>
  );
}

export function PremiumDashboard({ data }: { data: PremiumDashboardPayload }) {
  const avail = React.useMemo(() => Math.round(data.availabilityPct ?? 0), [data.availabilityPct]);
  const alertsOpen = data.alerts.length;
  const alertsCritical = data.alertsCriticalCount;

  return (
    <DashboardPremiumChrome>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-[1.65rem]">
              Bienvenue, Expert Maintenance — GMAO
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
              Pilotage technique & conformité — {data.machinesOperational}/{data.machinesTotal} machines
              opérationnelles · {data.openInterventions} intervention(s) ouverte(s).
            </p>
          </div>
          <ButtonLink href="/interventions/new" size="lg" className="shrink-0 rounded-lg bg-[#1F76FB] px-5 hover:bg-[#1865D9]">
            Saisir une intervention
          </ButtonLink>
        </div>

        {/* Maquette : gauche empilé (dispo + stock), centre interventions, droite machine */}
        <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-12 lg:grid-rows-2 lg:items-stretch">
          <DashboardCard className="relative lg:col-span-3 lg:row-start-1">
            <CheckCircle2
              className="absolute right-4 top-4 h-4 w-4 text-[#1F76FB]/70"
              strokeWidth={2}
              aria-hidden
            />
            <p className="pr-6 text-xs font-semibold uppercase tracking-wide text-slate-500">Disponibilité parc</p>
            <div className="mt-1 flex justify-center">
              <DashboardRadialGauge value={avail} size={128} />
            </div>
          </DashboardCard>

          <DashboardCard className="flex flex-col lg:col-span-3 lg:row-start-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stocks critiques</p>
            <div className="mt-2 flex items-end justify-between gap-2">
              <p className="text-3xl font-bold tabular-nums leading-none text-slate-900 md:text-4xl">
                {data.criticalStockCount}
              </p>
              <DashboardSparkline data={data.sparkStock} className="w-[5.5rem] shrink-0" height={40} />
            </div>
            <p className="mt-1.5 text-xs text-slate-600">
              {data.criticalStockCount > 0 ? "Attention requise" : "Niveau normal"}
            </p>
            <Link href="/stock" className="mt-2 text-xs font-medium text-[#1F76FB] hover:underline">
              Catalogue stock →
            </Link>
          </DashboardCard>

          <DashboardCard className="flex flex-col lg:col-span-3 lg:row-span-2 lg:row-start-1 lg:h-full">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Interventions en cours</p>
            <p className="mt-2 text-4xl font-bold tabular-nums leading-none text-slate-900">{data.openInterventions}</p>
            <p className="mt-1 text-xs text-slate-600">Workflow OPEN</p>
            <div className="mt-4 space-y-2">
              <AlertRow label="Alertes ouvertes" value={alertsOpen} />
              <AlertRow label="Alertes critiques" value={alertsCritical} />
              {alertsCritical > 0 ? (
                <AlertRow
                  label={`Alertes critiques (${alertsCritical})`}
                  value={alertsCritical}
                  highlight
                />
              ) : null}
            </div>
            <Link
              href="/interventions"
              className="mt-auto pt-4 text-xs font-medium text-[#1F76FB] hover:underline"
            >
              Voir l&apos;historique →
            </Link>
          </DashboardCard>

          <div className="h-full lg:col-span-6 lg:row-span-2 lg:row-start-1">
            <DashboardFeaturedMachine machine={data.featuredMachine} />
          </div>
        </div>

        <div className="grid gap-4 md:gap-5 lg:grid-cols-12 lg:items-start">
          <DashboardCard className="lg:col-span-8">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <span aria-hidden>📊</span>
              Statut des Ordres de Maintenance
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">Taux de réalisation et planification — 30 derniers jours</p>
            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/50 p-2">
              <PremiumDashboardOmChart
                series={data.omTrackingSeries}
                successRatePct={data.omSuccessRatePct}
                totalCount={data.omTotalCount}
                completedCount={data.omCompletedCount}
              />
            </div>
            <Link
              href="/maintenance-orders"
              className="mt-3 inline-block text-xs font-medium text-[#1F76FB] hover:underline"
            >
              Voir tous les ordres de maintenance →
            </Link>
          </DashboardCard>

          <div className="lg:col-span-4">
            <DashboardMttrGrid points={data.mttrMonthly} />
          </div>
        </div>
      </div>
    </DashboardPremiumChrome>
  );
}
