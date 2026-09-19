"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { TypeMonthPoint } from "@/lib/gmao/dashboard-premium-data";

export function DashboardTypeTrendChart({ series }: { series: TypeMonthPoint[] }) {
  const hasData = series.some((p) => p.preventives > 0 || p.correctives > 0);
  if (!hasData) {
    return <p className="flex h-[280px] items-center justify-center text-sm text-slate-500">Pas encore d’historique mensuel.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="18%" barGap={2}>
        <CartesianGrid stroke="#F1F5F9" strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
        <Tooltip
          contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", fontSize: 12 }}
          formatter={(value, name) => [value ?? 0, String(name)]}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Bar dataKey="preventives" name="Préventives" fill="#14b8a6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="correctives" name="Correctives" fill="#f59e0b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
