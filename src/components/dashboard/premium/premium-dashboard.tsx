"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import * as React from "react";

import { GmaoCtaTile, GmaoKpiTile, trendFromCounts } from "@/components/dashboard/portal/gmao-kpi-tile";
import { GmaoPortalQuickActions } from "@/components/dashboard/portal/gmao-portal-quick-actions";
import { Skeleton } from "@/components/ui/skeleton";
import type { PremiumDashboardPayload } from "@/lib/gmao/dashboard-premium-data";

const PremiumDashboardOmChart = dynamic(
  () =>
    import("@/components/dashboard/premium/premium-dashboard-om-chart").then((m) => ({
      default: m.PremiumDashboardOmChart,
    })),
  { loading: () => <Skeleton className="h-[280px] w-full rounded-xl bg-slate-100" />, ssr: false },
);

const DashboardTypeTrendChart = dynamic(
  () =>
    import("@/components/dashboard/premium/dashboard-type-trend-chart").then((m) => ({
      default: m.DashboardTypeTrendChart,
    })),
  { loading: () => <Skeleton className="h-[280px] w-full rounded-xl bg-slate-100" />, ssr: false },
);

const DashboardSectorChart = dynamic(
  () =>
    import("@/components/dashboard/premium/dashboard-sector-chart").then((m) => ({
      default: m.DashboardSectorChart,
    })),
  { loading: () => <Skeleton className="h-[280px] w-full rounded-xl bg-slate-100" />, ssr: false },
);

function fmt(n: number): string {
  return n.toLocaleString("fr-FR");
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      {children}
    </section>
  );
}

export function PremiumDashboard({ data }: { data: PremiumDashboardPayload }) {
  const avail = React.useMemo(() => Math.round(data.availabilityPct ?? 0), [data.availabilityPct]);

  return (
    <div className="-mx-3 -mt-3 bg-gradient-to-br from-slate-100 via-white to-sky-50 md:-mx-5 md:-mt-5 lg:-mx-6 lg:-mt-6">
      <GmaoPortalQuickActions />

      <div className="space-y-10 px-4 py-8 md:px-8">
        <Section title="Indicateurs clés">
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <GmaoKpiTile
              href="/interventions"
              value={fmt(data.preventivesToDo)}
              label="Préventives à réaliser"
              accent="teal"
              trend={{ ...trendFromCounts(data.preventivesThisMonth, data.preventivesLastMonth), hint: "volume du mois" }}
            />
            <GmaoKpiTile
              href="/interventions"
              value={fmt(data.correctivesThisMonth)}
              label="Correctives ce mois"
              accent="orange"
              valueClassName="text-orange-500"
              trend={trendFromCounts(data.correctivesThisMonth, data.correctivesLastMonth)}
            />
            <GmaoKpiTile
              href="/stock"
              value={fmt(data.criticalStockCount)}
              label="Pièces sous seuil de stock"
              accent={data.criticalStockCount > 0 ? "orange" : "teal"}
              valueClassName={data.criticalStockCount > 0 ? "text-orange-500" : undefined}
            />
            <GmaoKpiTile
              href="/machines"
              value={`${avail} %`}
              label="Disponibilité du parc"
              accent="blue"
              valueClassName="text-[#1F76FB]"
            />
            <GmaoKpiTile
              href="/interventions"
              value={fmt(data.interventionsThisMonth)}
              label="Interventions ce mois"
              accent="teal"
              trend={trendFromCounts(data.interventionsThisMonth, data.interventionsLastMonth)}
            />
            <GmaoKpiTile
              href="/interventions"
              value={fmt(data.preventivesOverdue)}
              label="Préventives en retard"
              accent="orange"
              valueClassName="text-orange-500"
            />
            <GmaoKpiTile
              href="/machines"
              value={fmt(data.machinesDown)}
              label="Machines hors service"
              accent="rose"
              valueClassName="text-rose-500"
            />
            <GmaoCtaTile
              href="/interventions"
              title="Liste de Maintenance"
              subtitle={`${fmt(data.machinesOperational)}/${fmt(data.machinesTotal)} machines opérationnelles`}
            />
          </div>
        </Section>

        <Section title="Suivi graphique des interventions">
          <div className="grid gap-6 xl:grid-cols-5">
            <div className="bg-white p-5 shadow-sm ring-1 ring-slate-200/80 xl:col-span-3">
              <p className="text-sm font-semibold text-slate-800">Préventives vs correctives</p>
              <p className="text-xs text-slate-500">Volume mensuel sur 12 mois</p>
              <div className="mt-3">
                <DashboardTypeTrendChart series={data.typeMonthly} />
              </div>
            </div>
            <div className="bg-white p-5 shadow-sm ring-1 ring-slate-200/80 xl:col-span-2">
              <p className="text-sm font-semibold text-slate-800">Répartition par secteur</p>
              <p className="text-xs text-slate-500">Interventions cumulées</p>
              <div className="mt-3">
                <DashboardSectorChart slices={data.sectorBreakdown} />
              </div>
            </div>
          </div>
        </Section>

        <Section title="Alertes et stocks">
          <div className="grid gap-6 xl:grid-cols-5">
            <div className="grid gap-6 sm:grid-cols-2 xl:col-span-2">
              <GmaoKpiTile
                href="/stock"
                value={fmt(data.criticalStockCount)}
                label="Alertes stock bas"
                accent={data.criticalStockCount > 0 ? "orange" : "teal"}
                valueClassName={data.criticalStockCount > 0 ? "text-orange-500" : undefined}
              />
              <GmaoKpiTile
                href="/interventions"
                value={fmt(data.alertsCriticalCount)}
                label="Alertes criticité haute"
                accent="rose"
                valueClassName="text-rose-500"
              />
              <GmaoKpiTile
                href="/maintenance-orders"
                value={fmt(data.omActiveCount)}
                label="Ordres de maintenance actifs"
                accent="blue"
                valueClassName="text-[#1F76FB]"
              />
              <GmaoKpiTile
                href="/interventions"
                value={`${fmt(data.maintenanceHoursMonth)} h`}
                label="Heures de maintenance (mois)"
                accent="teal"
              />
            </div>
            <div className="bg-white p-5 shadow-sm ring-1 ring-slate-200/80 xl:col-span-3">
              <p className="text-sm font-semibold text-slate-800">Suivi des ordres de maintenance</p>
              <p className="mb-3 text-xs text-slate-500">30 derniers jours</p>
              <PremiumDashboardOmChart
                series={data.omTrackingSeries}
                successRatePct={data.omSuccessRatePct}
                totalCount={data.omTotalCount}
                completedCount={data.omCompletedCount}
              />
              {data.alerts.length > 0 ? (
                <ul className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                  {data.alerts.slice(0, 4).map((alert) => (
                    <li key={alert.id} className="text-sm text-slate-700">
                      <span className="font-medium">{alert.title}</span>
                      {alert.message ? <span className="text-slate-500"> — {alert.message}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-slate-500">Aucune alerte GMAO ouverte.</p>
              )}
              <Link href="/stock" className="mt-3 inline-block text-xs font-medium text-[#1F76FB] hover:underline">
                Ouvrir Stock & Pièces →
              </Link>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
