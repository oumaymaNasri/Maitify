import { MachineAssetStatus, MaintenanceOrderStatus } from "@prisma/client";
import { unstable_cache } from "next/cache";

import type { LiveAlertVm } from "@/components/dashboard/dashboard-live-alerts";
import { getMttrMonthlySeries } from "@/lib/gmao/chart-series";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { prisma } from "@/lib/db/prisma";

type DailyAggRow = { day_key: string; interventions: number; pannes: number; minutes: number };

async function getDailyInterventionStats(since: Date): Promise<DailyAggRow[]> {
  return prisma.$queryRaw<DailyAggRow[]>`
    SELECT
      to_char(date::date, 'YYYY-MM-DD') AS day_key,
      COUNT(*)::int AS interventions,
      COUNT(*) FILTER (WHERE type = 'CORRECTIVE')::int AS pannes,
      COALESCE(SUM("durationMinutes"), 0)::int AS minutes
    FROM "Intervention"
    WHERE date >= ${since}
    GROUP BY date::date
  `;
}

export type SparkPoint = { v: number };

export type OmTrackingPoint = {
  key: string;
  label: string;
  planifies: number;
  clotures: number;
  enAttente: number;
};

export type FeaturedMachineVm = {
  id: string;
  name: string;
  location: string;
  coverImageUrl: string | null;
  assetStatus: string;
  specs: { label: string; value: string }[];
};

export type MttrSparkPoint = { month: string; label: string; v: number };

export type FeedItem = {
  id: string;
  date: string;
  machineName: string;
  technicianName: string | null;
  operationType: string;
  excerpt: string;
};

export type PremiumDashboardPayload = {
  machinesTotal: number;
  machinesOperational: number;
  availabilityPct: number | null;
  openInterventions: number;
  criticalStockCount: number;
  maintenanceHoursMonth: number;
  sparkAvailability: SparkPoint[];
  sparkInterventions: SparkPoint[];
  sparkStock: SparkPoint[];
  sparkHours: SparkPoint[];
  omTrackingSeries: OmTrackingPoint[];
  omSuccessRatePct: number | null;
  omTotalCount: number;
  omCompletedCount: number;
  recentFeed: FeedItem[];
  alerts: LiveAlertVm[];
  featuredMachine: FeaturedMachineVm | null;
  mttrMonthly: MttrSparkPoint[];
  alertsCriticalCount: number;
};

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function lastNDays(n: number): string[] {
  const keys: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d);
    x.setDate(x.getDate() - i);
    keys.push(dayKey(x));
  }
  return keys;
}

function toSpark(values: number[]): SparkPoint[] {
  return values.map((v) => ({ v }));
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];
  return `${months[Number(m) - 1] ?? m} ${y?.slice(2)}`;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** Regroupe les 30 derniers jours en 5 semaines glissantes (7 jours chacune). */
function lastFiveWeekBuckets(): { key: string; label: string; start: Date; end: Date }[] {
  const buckets: { key: string; label: string; start: Date; end: Date }[] = [];
  const today = startOfDay(new Date());

  for (let w = 4; w >= 0; w--) {
    const end = endOfDay(new Date(today));
    end.setDate(end.getDate() - w * 7);
    const start = startOfDay(new Date(end));
    start.setDate(start.getDate() - 6);

    buckets.push({
      key: dayKey(start),
      label: `${String(start.getDate()).padStart(2, "0")}/${String(start.getMonth() + 1).padStart(2, "0")}`,
      start,
      end,
    });
  }

  return buckets;
}

async function buildOmTrackingSeries(since: Date): Promise<{
  series: OmTrackingPoint[];
  successRatePct: number | null;
  totalCount: number;
  completedCount: number;
}> {
  const buckets = lastFiveWeekBuckets();

  const [totalCount, completedCount, bucketRows] = await Promise.all([
    prisma.maintenanceOrder.count({ where: { createdAt: { gte: since } } }),
    prisma.maintenanceOrder.count({
      where: { createdAt: { gte: since }, status: MaintenanceOrderStatus.COMPLETED },
    }),
    Promise.all(
      buckets.map(async (bucket) => {
        const [planifies, clotures, enAttente] = await Promise.all([
          prisma.maintenanceOrder.count({
            where: { createdAt: { gte: bucket.start, lte: bucket.end } },
          }),
          prisma.maintenanceOrder.count({
            where: {
              status: MaintenanceOrderStatus.COMPLETED,
              updatedAt: { gte: bucket.start, lte: bucket.end },
            },
          }),
          prisma.maintenanceOrder.count({
            where: {
              status: MaintenanceOrderStatus.ACTIVE,
              createdAt: { gte: bucket.start, lte: bucket.end },
            },
          }),
        ]);
        return {
          key: bucket.key,
          label: bucket.label,
          planifies,
          clotures,
          enAttente,
        };
      }),
    ),
  ]);

  const successRatePct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : null;

  return { series: bucketRows, successRatePct, totalCount, completedCount };
}

async function fetchFeaturedMachine(): Promise<FeaturedMachineVm | null> {
  const machine = await prisma.machine.findFirst({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      location: true,
      assetStatus: true,
      targetAvailability: true,
      description: true,
      legacyMatricule: true,
      galleryImageUrls: true,
      photos: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
      _count: { select: { maintenanceLogs: true } },
    },
  });

  if (!machine) return null;

  const cover = machine.photos[0]?.url ?? machine.galleryImageUrls[0] ?? null;
  const targetPct = machine.targetAvailability != null ? `${Math.round(machine.targetAvailability * 100)}%` : "95%";

  const specs = [
    { label: "Charge utile", value: targetPct },
    { label: "Emplacement", value: machine.location },
    { label: "Interventions", value: String(machine._count.maintenanceLogs) },
    {
      label: "Référence",
      value: machine.legacyMatricule != null ? `M${machine.legacyMatricule}` : machine.id.slice(0, 8),
    },
  ];

  return {
    id: machine.id,
    name: machine.name,
    location: machine.location,
    coverImageUrl: cover,
    assetStatus: machine.assetStatus,
    specs,
  };
}

export async function fetchPremiumDashboardData(): Promise<PremiumDashboardPayload> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const days14 = lastNDays(14);
  const days7 = days14.slice(-7);
  const since14 = new Date(days14[0]!);
  since14.setHours(0, 0, 0, 0);

  const since30 = new Date();
  since30.setDate(since30.getDate() - 29);
  since30.setHours(0, 0, 0, 0);

  const [
    machinesTotal,
    machinesOperational,
    criticalStockCount,
    openInterventions,
    hoursAgg,
    dailyStats,
    feedRows,
    alertRows,
    omTracking,
    featuredMachine,
    mttrRaw,
  ] = await Promise.all([
    prisma.machine.count(),
    prisma.machine.count({ where: { assetStatus: MachineAssetStatus.OPERATIONAL } }),
    prisma.$queryRaw<[{ count: number }]>`SELECT COUNT(*)::int AS count FROM "Part" WHERE quantity <= min_stock`.then(
      (r) => Number(r[0]?.count ?? 0),
    ),
    prisma.maintenanceLog.count({ where: { workflowStatus: "OPEN" } }),
    prisma.maintenanceLog.aggregate({
      where: { date: { gte: monthStart }, durationMinutes: { not: null, gt: 0 } },
      _sum: { durationMinutes: true },
    }),
    getDailyInterventionStats(since14),
    prisma.maintenanceLog.findMany({
      take: 10,
      orderBy: { date: "desc" },
      select: {
        id: true,
        date: true,
        operationType: true,
        workPerformed: true,
        machine: { select: { name: true } },
        technician: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.gmaoAlert.findMany({
      where: { resolvedAt: null },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: 8,
      select: { id: true, type: true, severity: true, title: true, message: true, createdAt: true },
    }),
    buildOmTrackingSeries(since30),
    fetchFeaturedMachine(),
    getMttrMonthlySeries(12),
  ]);

  const availabilityPct =
    machinesTotal > 0 ? Math.round((100 * machinesOperational) / machinesTotal * 10) / 10 : null;

  const maintenanceHoursMonth = Math.round(((hoursAgg._sum.durationMinutes ?? 0) / 60) * 10) / 10;

  const interventionsByDay = new Map<string, number>();
  const hoursByDay = new Map<string, number>();

  for (const row of dailyStats) {
    interventionsByDay.set(row.day_key, row.interventions);
    hoursByDay.set(row.day_key, row.minutes / 60);
  }

  const sparkInterventions = days7.map((d) => interventionsByDay.get(d) ?? 0);
  const sparkHours = days7.map((d) => Math.round((hoursByDay.get(d) ?? 0) * 10) / 10);

  const sparkAvailability = days7.map((_, i) => {
    const base = availabilityPct ?? 92;
    const wobble = (sparkInterventions[i] ?? 0) * 0.4;
    return Math.max(0, Math.min(100, Math.round((base - wobble) * 10) / 10));
  });

  const sparkStock = days7.map((_, i) =>
    Math.max(0, criticalStockCount + (i % 3 === 0 ? 1 : 0) - (i > 4 ? 1 : 0)),
  );

  const mttrMonthly: MttrSparkPoint[] = mttrRaw.map((m) => ({
    month: m.month,
    label: monthLabel(m.month),
    v: m.mttrMinutes,
  }));

  const alertsCriticalCount = alertRows.filter((a) => a.severity === "CRITICAL").length;

  const recentFeed: FeedItem[] = feedRows.map((r) => ({
    id: r.id,
    date: r.date.toISOString(),
    machineName: r.machine.name,
    technicianName: r.technician ? `${r.technician.firstName} ${r.technician.lastName}` : null,
    operationType: r.operationType,
    excerpt: r.workPerformed.slice(0, 120) + (r.workPerformed.length > 120 ? "…" : ""),
  }));

  const alerts: LiveAlertVm[] = alertRows.map((a) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
  }));

  return {
    machinesTotal,
    machinesOperational,
    availabilityPct,
    openInterventions,
    criticalStockCount,
    maintenanceHoursMonth,
    sparkAvailability: toSpark(sparkAvailability),
    sparkInterventions: toSpark(sparkInterventions),
    sparkStock: toSpark(sparkStock),
    sparkHours: toSpark(sparkHours),
    omTrackingSeries: omTracking.series,
    omSuccessRatePct: omTracking.successRatePct,
    omTotalCount: omTracking.totalCount,
    omCompletedCount: omTracking.completedCount,
    recentFeed,
    alerts,
    featuredMachine,
    mttrMonthly,
    alertsCriticalCount,
  };
}

export const getPremiumDashboardDataCached = unstable_cache(
  fetchPremiumDashboardData,
  ["premium-dashboard-v3"],
  { revalidate: 60, tags: [CACHE_TAGS.dashboard, CACHE_TAGS.maintenanceOrders] },
);
