"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";

import { computeOccurrences } from "@/lib/preventive/compute-occurrences";
import type { PreventivePlanListItem } from "@/lib/preventive/plans-query";
import { todayTunisApprox } from "@/lib/preventive/preview-adapter";
import { cn } from "@/lib/utils";

const PALETTE = [
  "bg-blue-50 text-blue-800 border-blue-200",
  "bg-emerald-50 text-emerald-800 border-emerald-200",
  "bg-violet-50 text-violet-800 border-violet-200",
  "bg-amber-50 text-amber-900 border-amber-200",
  "bg-cyan-50 text-cyan-800 border-cyan-200",
  "bg-rose-50 text-rose-800 border-rose-200",
];
const WEEKDAY_HEADERS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const pad = (n: number) => String(n).padStart(2, "0");

type DayEntry = { planId: string; title: string; machine: string; time: string; color: string; moved: boolean };

/** Calendrier mensuel des échéances planifiées (calcul moteur côté client, sans écriture). */
export function PreventivePlansCalendar({
  plans,
  onOpenPlan,
}: {
  plans: PreventivePlanListItem[];
  onOpenPlan: (plan: PreventivePlanListItem) => void;
}) {
  const today = todayTunisApprox();
  const [cursor, setCursor] = React.useState(() => ({
    y: Number(today.slice(0, 4)),
    m: Number(today.slice(5, 7)),
  }));

  const daysInMonth = new Date(Date.UTC(cursor.y, cursor.m, 0)).getUTCDate();
  const from = `${cursor.y}-${pad(cursor.m)}-01`;
  const to = `${cursor.y}-${pad(cursor.m)}-${pad(daysInMonth)}`;
  const firstWeekday = ((new Date(Date.UTC(cursor.y, cursor.m - 1, 1)).getUTCDay() + 6) % 7) + 1; // 1=lun

  const byDay = React.useMemo(() => {
    const map = new Map<string, DayEntry[]>();
    plans.forEach((plan, idx) => {
      if (plan.status !== "ACTIVE") return;
      try {
        const { occurrences } = computeOccurrences(plan.scheduleInput, { from, to });
        for (const o of occurrences) {
          if (!o.plannedDate || o.plannedDate < from || o.plannedDate > to) continue;
          const list = map.get(o.plannedDate) ?? [];
          list.push({
            planId: plan.id,
            title: plan.title,
            machine: plan.machineName,
            time: o.plannedTime ?? o.theoreticalTime,
            color: PALETTE[idx % PALETTE.length]!,
            moved: o.sundayAdjustment !== "NONE",
          });
          map.set(o.plannedDate, list);
        }
      } catch {
        /* plan invalide : ignoré dans le calendrier */
      }
    });
    map.forEach((list) => list.sort((a, b) => a.time.localeCompare(b.time)));
    return map;
  }, [plans, from, to]);

  const monthLabel = new Date(Date.UTC(cursor.y, cursor.m - 1, 1)).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const shift = (delta: number) =>
    setCursor((c) => {
      const idx = c.y * 12 + (c.m - 1) + delta;
      return { y: Math.floor(idx / 12), m: (idx % 12) + 1 };
    });

  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday - 1 }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${cursor.y}-${pad(cursor.m)}-${pad(i + 1)}`),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const planById = new Map(plans.map((p) => [p.id, p]));

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => shift(-1)} className="rounded-md p-1.5 hover:bg-slate-100" aria-label="Mois précédent">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => shift(1)} className="rounded-md p-1.5 hover:bg-slate-100" aria-label="Mois suivant">
            <ChevronRight className="h-4 w-4" />
          </button>
          <h3 className="ml-2 text-sm font-semibold capitalize text-slate-900">{monthLabel}</h3>
        </div>
        <button
          type="button"
          onClick={() => setCursor({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) })}
          className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          Aujourd&apos;hui
        </button>
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[760px] grid-cols-7">
          {WEEKDAY_HEADERS.map((d) => (
            <div key={d} className="border-b border-slate-100 bg-slate-50 px-2 py-1.5 text-[11px] font-semibold uppercase text-slate-500">
              {d}
            </div>
          ))}
          {cells.map((day, i) => {
            const entries = day ? byDay.get(day) ?? [] : [];
            const isSunday = i % 7 === 6;
            return (
              <div
                key={day ?? `empty-${i}`}
                className={cn(
                  "min-h-[104px] border-b border-r border-slate-100 p-1.5",
                  !day && "bg-slate-50/60",
                  isSunday && day && "bg-slate-50",
                )}
              >
                {day ? (
                  <>
                    <div
                      className={cn(
                        "mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                        day === today ? "bg-[#1F76FB] font-semibold text-white" : "text-slate-600",
                      )}
                    >
                      {Number(day.slice(8))}
                    </div>
                    <div className="space-y-1">
                      {entries.slice(0, 3).map((e, k) => (
                        <button
                          key={`${e.planId}-${e.time}-${k}`}
                          type="button"
                          title={`${e.time} · ${e.title} — ${e.machine}${e.moved ? " (reportée)" : ""}`}
                          onClick={() => {
                            const plan = planById.get(e.planId);
                            if (plan) onOpenPlan(plan);
                          }}
                          className={cn("block w-full truncate rounded border px-1.5 py-0.5 text-left text-[11px]", e.color)}
                        >
                          <span className="font-semibold tabular-nums">{e.time}</span> {e.machine}
                          {e.moved ? " ↷" : ""}
                        </button>
                      ))}
                      {entries.length > 3 ? (
                        <p className="px-1 text-[11px] text-slate-500">+{entries.length - 3} autre(s)</p>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
