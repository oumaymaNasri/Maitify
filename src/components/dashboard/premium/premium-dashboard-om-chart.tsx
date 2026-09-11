"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { BRAND_BLUE } from "@/lib/brand";
import type { OmTrackingPoint } from "@/lib/gmao/dashboard-premium-data";

type PremiumDashboardOmChartProps = {
  series: OmTrackingPoint[];
  successRatePct: number | null;
  totalCount: number;
  completedCount: number;
};

export function PremiumDashboardOmChart({
  series,
  successRatePct,
  totalCount,
  completedCount,
}: PremiumDashboardOmChartProps) {
  const hasData = series.some((p) => p.planifies > 0 || p.clotures > 0 || p.enAttente > 0);

  if (!hasData) {
    return (
      <div className="relative flex min-h-[280px] flex-col items-center justify-center gap-2 text-center">
        {successRatePct != null ? (
          <p className="absolute right-3 top-0 rounded-lg border border-[#1F76FB]/20 bg-[#E8F1FF] px-3 py-1.5 text-xs font-semibold text-[#1F76FB]">
            Taux de réussite global : {successRatePct}%
          </p>
        ) : null}
        <p className="text-sm text-slate-500">Aucun ordre de maintenance sur les 30 derniers jours.</p>
        <p className="text-xs text-slate-400">Planifiez un OM depuis le module Ordre de maintenance.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute right-0 top-0 z-10 rounded-lg border border-[#1F76FB]/20 bg-[#E8F1FF] px-3 py-2 text-right shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#1F76FB]/80">Taux de réussite global</p>
        <p className="text-xl font-bold tabular-nums text-[#1F76FB]">
          {successRatePct != null ? `${successRatePct}%` : "—"}
        </p>
        <p className="text-[10px] text-slate-600">
          {completedCount}/{totalCount} OM clôturés
        </p>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={series} margin={{ top: 52, right: 8, left: 0, bottom: 0 }} barCategoryGap="22%" barGap={4}>
          <CartesianGrid stroke="#F1F5F9" strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "#64748b", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            contentStyle={{
              border: "1px solid #F1F5F9",
              borderRadius: 12,
              background: "#fff",
              fontSize: 12,
            }}
            formatter={(value, name) => [value ?? 0, String(name)]}
            labelFormatter={(label) => `Semaine du ${label}`}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={(v) => <span className="text-slate-600">{v}</span>}
          />
          <Bar
            dataKey="planifies"
            name="Planifiés"
            fill="#94BFFF"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
          <Bar
            dataKey="enAttente"
            name="En attente"
            fill="#5B9BF8"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
          <Bar
            dataKey="clotures"
            name="Clôturés"
            fill={BRAND_BLUE}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
