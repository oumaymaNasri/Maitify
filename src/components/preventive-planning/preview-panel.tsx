"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { computeOccurrences, detectOccurrenceCollisions } from "@/lib/preventive";
import {
  addDaysIso,
  defaultPreviewHorizon,
  formValuesToPlanScheduleInput,
  type PreventivePlanFormValues,
} from "@/lib/preventive/preview-adapter";
import { preventiveFrequencyFr, sundayPolicyFr } from "@/lib/preventive/labels";

const HORIZON_PRESETS = [
  { days: 30, label: "30 jours" },
  { days: 60, label: "60 jours" },
  { days: 90, label: "90 jours" },
] as const;

const ADJUSTMENT_FR: Record<string, string> = {
  PREV_SATURDAY: "→ samedi",
  NEXT_MONDAY: "→ lundi",
  SKIP: "Ignorée",
};

function formatDayFr(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function PreventivePreviewPanel({
  values,
  maintenanceTypeLabel,
  defaultHorizonDays = 60,
  className,
}: {
  values: PreventivePlanFormValues;
  maintenanceTypeLabel?: string;
  defaultHorizonDays?: number;
  className?: string;
}) {
  const [horizonDays, setHorizonDays] = React.useState(defaultHorizonDays);
  const [customFrom, setCustomFrom] = React.useState("");
  const [customTo, setCustomTo] = React.useState("");

  const { result, error } = React.useMemo(() => {
    try {
      const plan = formValuesToPlanScheduleInput({
        ...values,
        status: "ACTIVE",
      });
      let horizon = defaultPreviewHorizon(horizonDays);
      let localError: string | null = null;
      if (customFrom && customTo) {
        if (customFrom > customTo) {
          return {
            result: {
              occurrences: [],
              stats: { theoretical: 0, skipped: 0, rescheduled: 0, generatable: 0 },
              collisions: [],
            },
            error: "La date de fin doit être postérieure à la date de début.",
          };
        }
        const span =
          (Date.parse(`${customTo}T00:00:00Z`) - Date.parse(`${customFrom}T00:00:00Z`)) / 86_400_000;
        if (span > 366) {
          localError = "Période personnalisée limitée à 366 jours (tronquée).";
          horizon = { from: customFrom, to: addDaysIso(customFrom, 365) };
        } else {
          horizon = { from: customFrom, to: customTo };
        }
      }
      const computed = computeOccurrences(plan, horizon);
      const collisions = detectOccurrenceCollisions(computed.occurrences);
      return { result: { ...computed, collisions }, error: localError };
    } catch (e) {
      return {
        result: {
          occurrences: [],
          stats: { theoretical: 0, skipped: 0, rescheduled: 0, generatable: 0 },
          collisions: [],
        },
        error: e instanceof Error ? e.message : "Prévisualisation impossible.",
      };
    }
  }, [values, horizonDays, customFrom, customTo]);

  return (
    <section className={`space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className ?? ""}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Prévisualisation ({customFrom && customTo ? "période personnalisée" : `${horizonDays} jours`})
          </h3>
          <p className="text-xs text-slate-500">Calcul en temps réel — aucune écriture en base. Fuseau Africa/Tunis.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {HORIZON_PRESETS.map((p) => (
            <button
              key={p.days}
              type="button"
              onClick={() => {
                setHorizonDays(p.days);
                setCustomFrom("");
                setCustomTo("");
              }}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                horizonDays === p.days && !customFrom
                  ? "border-[#1F76FB] bg-blue-50 text-[#1F76FB]"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-slate-600">
          Du
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-slate-600">
          Au
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
          />
        </label>
      </div>

      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Théoriques", value: result.stats.theoretical, cls: "border-slate-200 bg-slate-50 text-slate-900" },
          { label: "Planifiables", value: result.stats.generatable, cls: "border-emerald-200 bg-emerald-50 text-emerald-800" },
          { label: "Reportées", value: result.stats.rescheduled, cls: "border-amber-200 bg-amber-50 text-amber-800" },
          { label: "Ignorées", value: result.stats.skipped, cls: "border-rose-200 bg-rose-50 text-rose-700" },
        ].map((c) => (
          <div key={c.label} className={`rounded-lg border px-3 py-2 ${c.cls}`}>
            <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">{c.label}</p>
            <p className="text-xl font-semibold tabular-nums">{c.value}</p>
          </div>
        ))}
      </div>
      {result.collisions.length > 0 ? (
        <Badge variant="destructive">Collisions : {result.collisions.length}</Badge>
      ) : null}

      <p className="text-xs text-slate-500">
        {preventiveFrequencyFr(values.frequency)} · {values.occurrencesPerPeriod}× / période · Dimanche{" "}
        {values.includeSunday ? "inclus" : `exclu (${sundayPolicyFr(values.sundayPolicy)})`}
        {maintenanceTypeLabel ? ` · ${maintenanceTypeLabel}` : ""}
      </p>

      {result.occurrences.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          Aucune occurrence sur la période. Vérifiez les dates, le mode et les créneaux.
        </p>
      ) : (
        <div className="max-h-[420px] overflow-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Date théorique</th>
                <th className="px-3 py-2">Date planifiée</th>
                <th className="px-3 py-2">Heure</th>
                <th className="px-3 py-2">Ajustement</th>
              </tr>
            </thead>
            <tbody>
              {result.occurrences.slice(0, 200).map((o) => (
                <tr key={o.occurrenceKey} className="border-t border-slate-100">
                  <td className="whitespace-nowrap px-3 py-1.5 text-slate-600">{formatDayFr(o.theoreticalDate)}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 font-medium text-slate-900">
                    {o.plannedDate ? formatDayFr(o.plannedDate) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-3 py-1.5 tabular-nums">{o.plannedTime ?? o.theoreticalTime}</td>
                  <td className="px-3 py-1.5">
                    {o.sundayAdjustment === "NONE" ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <Badge variant={o.sundayAdjustment === "SKIP" ? "outline" : "warning"}>
                        {ADJUSTMENT_FR[o.sundayAdjustment] ?? o.sundayAdjustment}
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.collisions.length > 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <p className="font-semibold">Collisions détectées (autorisées)</p>
          <ul className="mt-1 list-disc pl-4">
            {result.collisions.slice(0, 5).map((c) => (
              <li key={`${c.machineId}-${c.plannedDate}-${c.plannedTime}`}>
                {c.plannedDate} {c.plannedTime} — {c.occurrenceKeys.length} tâches
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
