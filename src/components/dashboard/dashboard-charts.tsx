"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MttrMonthPoint, WaterDailyPoint } from "@/lib/gmao/chart-series";

export function DashboardChartsSection({
  mttrSeries,
  waterSeries,
}: {
  mttrSeries: MttrMonthPoint[];
  waterSeries: WaterDailyPoint[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">MTTR correctif par mois</CardTitle>
          <CardDescription>Temps moyen de réparation (durées renseignées), pondéré mensuel.</CardDescription>
        </CardHeader>
        <CardContent className="h-[260px] w-full pb-6 pt-0">
          {mttrSeries.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Pas assez de données correctives avec durée.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mttrSeries} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={40} label={{ value: "min", angle: -90, position: "insideLeft", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                  formatter={(value, _name, item) => {
                    const raw = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
                    const min = Number.isFinite(raw) ? raw : undefined;
                    const count = (item?.payload as MttrMonthPoint | undefined)?.count ?? "?";
                    return [`${min ?? "—"} min (${count} corr.)`, "MTTR"];
                  }}
                  labelFormatter={(l) => `Mois ${l}`}
                />
                <Bar dataKey="mttrMinutes" name="MTTR" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tendance qualité de l&apos;eau</CardTitle>
          <CardDescription>
            Moyenne journalière (toutes zones) — pH, TH ; conductivité sur axe droit (&micro;S/cm).
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[280px] w-full pb-4 pt-0">
          {waterSeries.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Pas de séries quotidiennes sur la période.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={waterSeries} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.45} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10 }}
                  width={44}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                  }}
                  labelFormatter={(l) => l}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="ph"
                  name="pH"
                  stroke="hsl(var(--chart-1))"
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="th"
                  name="TH"
                  stroke="hsl(var(--chart-3))"
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="conductivity"
                  name="Cond."
                  stroke="hsl(var(--chart-2))"
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
