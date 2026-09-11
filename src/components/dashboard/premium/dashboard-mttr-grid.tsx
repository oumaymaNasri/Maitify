"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";

import { DashboardCard } from "@/components/dashboard/premium/dashboard-card";
import { BRAND_BLUE } from "@/lib/brand";
import type { MttrSparkPoint } from "@/lib/gmao/dashboard-premium-data";
import { ButtonLink } from "@/components/ui/button";

function MiniSparkline({ data }: { data: MttrSparkPoint }) {
  const chartData = [{ v: 0 }, { v: data.v }, { v: Math.max(0, data.v * 0.85) }];
  return (
    <ResponsiveContainer width="100%" height={36}>
      <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`mttr-${data.month}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND_BLUE} stopOpacity={0.35} />
            <stop offset="100%" stopColor={BRAND_BLUE} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={BRAND_BLUE}
          fill={`url(#mttr-${data.month})`}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function DashboardMttrGrid({ points }: { points: MttrSparkPoint[] }) {
  const cells = points.length >= 12 ? points.slice(-12) : points;

  return (
    <DashboardCard>
      <h2 className="text-base font-semibold text-slate-900">MTTR correctif par mois</h2>
      <p className="mt-0.5 text-xs text-slate-600">Durée moyenne (minutes) — 12 derniers mois</p>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {cells.map((p) => (
          <div
            key={p.month}
            className="rounded-xl border border-slate-100 bg-slate-50/50 p-2 transition-colors hover:border-slate-200"
          >
            <p className="mb-1 text-[9px] font-medium text-slate-500">{p.label}</p>
            <MiniSparkline data={p} />
            <p className="mt-1 text-center text-[10px] font-semibold tabular-nums text-slate-800">{p.v} min</p>
          </div>
        ))}
      </div>

      <ButtonLink href="/interventions" className="mt-4 w-full bg-[#1F76FB] hover:bg-[#1865D9]">
        Toutes les interventions
      </ButtonLink>
    </DashboardCard>
  );
}
