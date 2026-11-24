import { AlertTriangle, CalendarClock, Pencil, Plus } from "lucide-react";
import Link from "next/link";

import type { MachinePlanItem, MachinePlanSummary } from "@/lib/preventive/machine-plan-summary";
import { cn } from "@/lib/utils";

function formatDateFr(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

const newPlanHref = (machineId: string) => `/preventive-planning?new=1&machineId=${encodeURIComponent(machineId)}`;
const editPlanHref = (planId: string) => `/preventive-planning?edit=${encodeURIComponent(planId)}`;

/** Bloc compact pour la carte machine : plan actif, fréquence, prochaine intervention. */
export function MachinePlanCompact({ machineId, summary }: { machineId: string; summary?: MachinePlanSummary | null }) {
  const next = summary?.next ?? null;
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Plan préventif</p>
        {next ? (
          <Link href={editPlanHref(next.id)} className="text-[11px] font-medium text-[#1F76FB] hover:underline">
            Modifier
          </Link>
        ) : null}
      </div>
      {next ? (
        <div className="space-y-0.5 text-xs">
          <p className="truncate font-medium text-slate-900" title={next.title}>
            {next.title}
            {summary && summary.activeCount > 1 ? (
              <span className="ml-1 text-slate-500">(+{summary.activeCount - 1})</span>
            ) : null}
          </p>
          <p className="text-slate-600">{next.frequencyLabel}</p>
          <p className="flex items-center gap-1 text-slate-700">
            <CalendarClock className="h-3 w-3 text-slate-400" />
            Prochaine : <span className="font-medium">{formatDateFr(next.nextDate)}</span> {next.nextTime ?? ""}
            {next.overdueCount > 0 ? (
              <span className="ml-1 inline-flex items-center gap-0.5 text-rose-600">
                <AlertTriangle className="h-3 w-3" />
                {next.overdueCount}
              </span>
            ) : null}
          </p>
        </div>
      ) : (
        <Link
          href={newPlanHref(machineId)}
          className="inline-flex items-center gap-1 text-xs font-medium text-[#1F76FB] hover:underline"
        >
          <Plus className="h-3 w-3" /> Créer le plan de maintenance
        </Link>
      )}
    </div>
  );
}

function PlanRow({ plan }: { plan: MachinePlanItem }) {
  const active = plan.status === "ACTIVE";
  return (
    <tr className="border-t border-slate-100">
      <td className="px-3 py-2">
        <p className="font-medium text-slate-900">{plan.title}</p>
        <p className="text-xs text-slate-500">{plan.typeLabel}</p>
      </td>
      <td className="whitespace-nowrap px-3 py-2">{plan.frequencyLabel}</td>
      <td className="px-3 py-2">{plan.assigneeName ?? <span className="text-slate-400">—</span>}</td>
      <td className="whitespace-nowrap px-3 py-2">
        {active ? (
          <>
            {formatDateFr(plan.nextDate)} <span className="text-slate-500">{plan.nextTime ?? ""}</span>
          </>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td className="px-3 py-2 text-center">
        {plan.overdueCount > 0 ? (
          <span className="font-semibold text-rose-600">{plan.overdueCount}</span>
        ) : (
          <span className="text-slate-400">0</span>
        )}
      </td>
      <td className="px-3 py-2">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600",
          )}
        >
          {active ? "Actif" : "Inactif"}
        </span>
      </td>
      <td className="px-3 py-2 text-right">
        <Link
          href={editPlanHref(plan.id)}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
        >
          <Pencil className="h-3 w-3" /> Modifier
        </Link>
      </td>
    </tr>
  );
}

/** Section complète pour la fiche (Profil) machine. */
export function MachinePlanSection({ machineId, summary }: { machineId: string; summary?: MachinePlanSummary | null }) {
  const plans = summary?.plans ?? [];
  const next = summary?.next ?? null;
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CalendarClock className="h-4 w-4 text-[#1F76FB]" />
            Plan de maintenance préventive
          </h2>
          {next ? (
            <p className="mt-0.5 text-xs text-slate-600">
              Prochaine intervention prévue :{" "}
              <span className="font-medium text-slate-900">
                {formatDateFr(next.nextDate)} {next.nextTime ?? ""}
              </span>{" "}
              — {next.title}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-slate-500">Aucun plan actif pour cette machine.</p>
          )}
        </div>
        <Link
          href={newPlanHref(machineId)}
          className="inline-flex items-center gap-1 rounded-md bg-[#1F76FB] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1865D9]"
        >
          <Plus className="h-3.5 w-3.5" /> {plans.length ? "Ajouter un plan" : "Créer le plan"}
        </Link>
      </div>
      {plans.length ? (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Fréquence</th>
                <th className="px-3 py-2">Technicien</th>
                <th className="px-3 py-2">Prochaine échéance</th>
                <th className="px-3 py-2 text-center">Retards</th>
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <PlanRow key={p.id} plan={p} />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
