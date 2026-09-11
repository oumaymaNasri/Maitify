import { prisma } from "@/lib/db/prisma";

export type MttrMonthPoint = { month: string; mttrMinutes: number; count: number };

type MttrAggRow = { month: string; mttr_minutes: number; count: number };

/** MTTR mensuel — agrégation SQL, sans chargement des lignes en mémoire. */
export async function getMttrMonthlySeries(limitMonths = 12): Promise<MttrMonthPoint[]> {
  const since = new Date();
  since.setMonth(since.getMonth() - (limitMonths + 2));
  since.setHours(0, 0, 0, 0);

  const rows = await prisma.$queryRaw<MttrAggRow[]>`
    SELECT
      to_char(date, 'YYYY-MM') AS month,
      ROUND(AVG("durationMinutes"))::int AS mttr_minutes,
      COUNT(*)::int AS count
    FROM "Intervention"
    WHERE type = 'CORRECTIVE'
      AND "durationMinutes" IS NOT NULL
      AND "durationMinutes" > 0
      AND date >= ${since}
    GROUP BY to_char(date, 'YYYY-MM')
    ORDER BY month DESC
    LIMIT ${limitMonths}
  `;

  return rows
    .slice()
    .reverse()
    .map((r) => ({
      month: r.month,
      mttrMinutes: Number(r.mttr_minutes) || 0,
      count: Number(r.count) || 0,
    }));
}

export type WaterDailyPoint = { day: string; ph: number | null; th: number | null; conductivity: number | null };

/** Moyennes journalières — agrégation SQL. */
export async function getWaterDailyAvgSeries(days = 56): Promise<WaterDailyPoint[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  type WaterAggRow = {
    day: string;
    ph: number | null;
    th: number | null;
    conductivity: number | null;
  };

  const rows = await prisma.$queryRaw<WaterAggRow[]>`
    SELECT
      to_char("measuredAt"::date, 'YYYY-MM-DD') AS day,
      ROUND(AVG(ph)::numeric, 2)::float8 AS ph,
      ROUND(AVG(th)::numeric, 2)::float8 AS th,
      ROUND(AVG(conductivity)::numeric, 2)::float8 AS conductivity
    FROM "WaterQualityMeasurement"
    WHERE "measuredAt" >= ${since}
    GROUP BY "measuredAt"::date
    ORDER BY day ASC
  `;

  return rows.map((r) => ({
    day: r.day,
    ph: r.ph != null ? Number(r.ph) : null,
    th: r.th != null ? Number(r.th) : null,
    conductivity: r.conductivity != null ? Number(r.conductivity) : null,
  }));
}
