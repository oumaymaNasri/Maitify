"use client";

import dynamic from "next/dynamic";
import * as React from "react";

import { GmaoCtaTile, GmaoKpiTile } from "@/components/dashboard/portal/gmao-kpi-tile";
import { GmaoPortalQuickActions } from "@/components/dashboard/portal/gmao-portal-quick-actions";
import { Skeleton } from "@/components/ui/skeleton";
import type { PremiumDashboardPayload } from "@/lib/gmao/dashboard-premium-data";

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

function fmt(n: number): string {
  return n.toLocaleString("fr-FR");
}

export function PremiumDashboard({ data }: { data: PremiumDashboardPayload }) {
  const avail = React.useMemo(() => Math.round(data.availabilityPct ?? 0), [data.availabilityPct]);

  return (
    <div className="-mx-3 -mt-3 bg-gradient-to-br from-slate-100 via-white to-sky-50 md:-mx-5 md:-mt-5 lg:-mx-6 lg:-mt-6">
      <GmaoPortalQuickActions />

      <div className="grid gap-4 px-4 py-6 md:grid-cols-2 md:px-8 xl:grid-cols-4">
        <GmaoKpiTile
          href="/interventions"
          value={fmt(data.preventivesToDo)}
          label="Préventives à réaliser"
          accent="teal"
        />
        <GmaoKpiTile
          href="/interventions"
          value={fmt(data.preventivesOverdue)}
          label="Préventives en retard"
          accent="orange"
          valueClassName="text-orange-500"
        />
        <GmaoKpiTile
          href="/maintenance-orders"
          value={fmt(data.omActiveCount)}
          label="Ordres de maintenance actifs"
          accent="teal"
        />

        <div className="border border-slate-200/80 bg-white p-4 shadow-sm md:col-span-2 xl:col-span-1 xl:row-span-2">
          <p className="text-sm font-semibold text-slate-700">Suivi des ordres de maintenance</p>
          <p className="text-xs text-slate-500">30 derniers jours</p>
          <div className="mt-2 min-h-[240px]">
            <PremiumDashboardOmChart
              series={data.omTrackingSeries}
              successRatePct={data.omSuccessRatePct}
              totalCount={data.omTotalCount}
              completedCount={data.omCompletedCount}
            />
          </div>
        </div>

        <GmaoKpiTile
          href="/stock"
          value={fmt(data.criticalStockCount)}
          label="Pièces sous seuil de stock"
          accent={data.criticalStockCount > 0 ? "orange" : "teal"}
          valueClassName={data.criticalStockCount > 0 ? "text-orange-500" : undefined}
        />
        <GmaoKpiTile
          href="/interventions"
          value={fmt(data.interventionsThisMonth)}
          label="Interventions ce mois"
          accent="teal"
        />
        <GmaoKpiTile
          href="/machines"
          value={`${avail} %`}
          label="Disponibilité du parc"
          accent="blue"
          valueClassName="text-[#1F76FB]"
        />

        <GmaoKpiTile
          href="/machines"
          value={fmt(data.machinesDown)}
          label="Machines hors service"
          accent="orange"
          valueClassName="text-orange-500"
        />
        <GmaoKpiTile
          href="/interventions"
          value={fmt(data.correctivesThisMonth)}
          label="Correctives ce mois"
          accent="orange"
          valueClassName="text-orange-500"
        />
        <GmaoCtaTile
          href="/interventions"
          title="Indicateurs 360°"
          subtitle={`${fmt(data.machinesOperational)}/${fmt(data.machinesTotal)} machines opérationnelles`}
        />

        <GmaoKpiTile
          href="/interventions"
          value={fmt(data.alertsCriticalCount)}
          label="Alertes criticité haute"
          accent="rose"
          valueClassName="text-rose-500"
        />
        <GmaoKpiTile
          href="/interventions"
          value={fmt(data.alerts.length)}
          label="Alertes GMAO à traiter"
          accent="orange"
          valueClassName="text-orange-500"
        />
        <GmaoKpiTile
          href="/interventions"
          value={`${fmt(data.maintenanceHoursMonth)} h`}
          label="Heures de maintenance (mois)"
          accent="teal"
        />
      </div>
    </div>
  );
}
