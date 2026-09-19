"use client";

import Link from "next/link";

import { GmaoCtaTile, GmaoKpiTile } from "@/components/dashboard/portal/gmao-kpi-tile";
import { GmaoPortalHeader } from "@/components/dashboard/portal/gmao-portal-header";
import { GmaoPortalQuickActions } from "@/components/dashboard/portal/gmao-portal-quick-actions";
import { DashboardCard } from "@/components/dashboard/premium/dashboard-card";
import { Badge } from "@/components/ui/badge";
import type { TechnicianDashboardPayload } from "@/lib/gmao/dashboard-technician-data";
import type { SessionUser } from "@/lib/auth/session";

export function TechnicianDashboard({
  data,
  user,
}: {
  data: TechnicianDashboardPayload;
  user: SessionUser;
}) {
  const firstName = user.name.split(" ")[0] ?? user.name;

  return (
    <div className="-mx-3 -mt-3 bg-gradient-to-br from-slate-100 via-white to-sky-50 md:-mx-5 md:-mt-5 lg:-mx-6 lg:-mt-6">
      <GmaoPortalHeader />
      <GmaoPortalQuickActions />

      <div className="space-y-4 px-4 py-6 md:px-8">
        <p className="text-sm text-slate-600">
          Bonjour {firstName} — vue terrain de vos interventions et ordres à réaliser.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <GmaoKpiTile
            href="/interventions"
            value={data.plannedTodayCount}
            label="Interventions à réaliser"
            accent="teal"
          />
          <GmaoKpiTile
            href="/interventions"
            value={data.closedThisMonthCount}
            label="Fiches clôturées ce mois"
            accent="blue"
            valueClassName="text-[#1F76FB]"
          />
          <GmaoKpiTile
            href="/maintenance-orders"
            value={data.upcomingOrders.length}
            label="Ordres à venir"
            accent="orange"
            valueClassName="text-orange-500"
          />
          <GmaoCtaTile href="/interventions/new" title="Nouvelle intervention" subtitle="Saisie terrain" />
        </div>

        <DashboardCard>
          <h2 className="text-base font-semibold text-slate-900">Prochains ordres de maintenance</h2>
          <p className="mt-0.5 text-xs text-slate-600">Planifiés par le Directeur — lecture seule</p>
          {data.upcomingOrders.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Aucun ordre actif pour le moment.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {data.upcomingOrders.map((om) => (
                <li key={om.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{om.reference}</p>
                    <p className="text-xs text-slate-500">
                      {om.machineNames} · {om.interventionType} · {om.plannedDateLabel}
                    </p>
                  </div>
                  <Badge variant="secondary">{om.statusLabel}</Badge>
                </li>
              ))}
            </ul>
          )}
          <Link href="/maintenance-orders" className="mt-2 inline-block text-xs font-medium text-[#1F76FB] hover:underline">
            Voir les ordres →
          </Link>
        </DashboardCard>
      </div>
    </div>
  );
}
