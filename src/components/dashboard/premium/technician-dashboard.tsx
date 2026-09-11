"use client";

import { CalendarCheck, CheckCircle2, ClipboardList, Plus } from "lucide-react";
import Link from "next/link";

import { DashboardCard } from "@/components/dashboard/premium/dashboard-card";
import { DashboardPremiumChrome } from "@/components/dashboard/premium/dashboard-premium-chrome";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import type { TechnicianDashboardPayload } from "@/lib/gmao/dashboard-technician-data";
import type { SessionUser } from "@/lib/auth/session";

export function TechnicianDashboard({
  data,
  user,
}: {
  data: TechnicianDashboardPayload;
  user: SessionUser;
}) {
  return (
    <DashboardPremiumChrome>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#1F76FB]">Espace terrain</p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-[1.65rem]">
              Bonjour, {user.name.split(" ")[0] ?? user.name}
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
              Vue simplifiée — vos interventions et ordres de maintenance à réaliser.
            </p>
          </div>
          <ButtonLink href="/interventions/new" size="lg" className="shrink-0 rounded-lg bg-[#1F76FB] px-5 hover:bg-[#1865D9]">
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            Saisir une intervention
          </ButtonLink>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <DashboardCard>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Mes interventions planifiées aujourd&apos;hui
                </p>
                <p className="mt-2 text-4xl font-bold tabular-nums text-slate-900">{data.plannedTodayCount}</p>
              </div>
              <CalendarCheck className="h-5 w-5 shrink-0 text-[#1F76FB]/70" aria-hidden />
            </div>
          </DashboardCard>

          <DashboardCard>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Mes fiches clôturées ce mois-ci
                </p>
                <p className="mt-2 text-4xl font-bold tabular-nums text-slate-900">{data.closedThisMonthCount}</p>
              </div>
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600/80" aria-hidden />
            </div>
          </DashboardCard>

          <DashboardCard className="flex flex-col justify-center bg-[#E8F1FF]/40">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#1F76FB]">Action rapide</p>
            <ButtonLink href="/interventions/new" className="mt-3 w-full bg-[#1F76FB] hover:bg-[#1865D9]">
              + Nouvelle intervention
            </ButtonLink>
            <Link href="/interventions" className="mt-2 text-center text-xs font-medium text-[#1F76FB] hover:underline">
              Voir mes fiches →
            </Link>
          </DashboardCard>
        </div>

        <DashboardCard>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-[#1F76FB]" aria-hidden />
            <h2 className="text-base font-semibold text-slate-900">Prochains ordres de maintenance</h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-600">Planifiés par le Directeur — lecture seule</p>

          {data.upcomingOrders.length === 0 ? (
            <p className="mt-6 rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500">
              Aucun ordre actif en attente de réalisation.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.upcomingOrders.map((om) => (
                <li
                  key={om.id}
                  className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{om.reference}</p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      {om.plannedDateLabel} · {om.interventionType} · {om.machineNames}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                      {om.statusLabel}
                    </Badge>
                    <span className="text-xs text-slate-500">{om.pendingLines} ligne(s) à faire</span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/maintenance-orders"
            className="mt-4 inline-block text-xs font-medium text-[#1F76FB] hover:underline"
          >
            Voir tous les ordres →
          </Link>
        </DashboardCard>
      </div>
    </DashboardPremiumChrome>
  );
}
