"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { SectorSlice } from "@/lib/gmao/dashboard-premium-data";

const COLORS = ["#1F76FB", "#14b8a6", "#f59e0b", "#0B2A5B", "#6366f1", "#fb7185", "#22c55e", "#64748b"];

export function DashboardSectorChart({ slices }: { slices: SectorSlice[] }) {
  const data = slices.filter((s) => s.count > 0);
  if (!data.length) {
    return <p className="flex h-[280px] items-center justify-center text-sm text-slate-500">Aucun secteur renseigné.</p>;
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_11rem]">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="sector" innerRadius={58} outerRadius={92} paddingAngle={2}>
            {data.map((entry, i) => (
              <Cell key={entry.sector} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", fontSize: 12 }}
            formatter={(value, name) => [value ?? 0, String(name)]}
          />
        </PieChart>
      </ResponsiveContainer>
      <ul className="space-y-1.5 self-center text-xs text-slate-600">
        {data.map((s, i) => (
          <li key={s.sector} className="flex items-start gap-2">
            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-medium text-slate-800">{s.sector}</span>
              <span className="tabular-nums text-slate-500">{s.count.toLocaleString("fr-FR")}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
