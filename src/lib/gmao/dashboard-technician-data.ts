import { MaintenanceOrderStatus, MaintenanceWorkflowStatus } from "@prisma/client";

import { unstable_cache } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache/tags";
import { prisma } from "@/lib/db/prisma";
import { formatDateFrShort } from "@/lib/utils/format-date";
import { maintenanceOrderStatusFr } from "@/lib/view/gmao-labels";
import { interventionTypeFr } from "@/lib/view/labels";

export type TechnicianUpcomingOm = {
  id: string;
  reference: string;
  plannedDate: string;
  plannedDateLabel: string;
  interventionType: string;
  statusLabel: string;
  machineNames: string;
  pendingLines: number;
};

export type TechnicianDashboardPayload = {
  plannedTodayCount: number;
  closedThisMonthCount: number;
  upcomingOrders: TechnicianUpcomingOm[];
};

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function fetchTechnicianDashboardData(
  technicianId: string,
): Promise<TechnicianDashboardPayload> {
  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const monthStart = startOfMonth();

  const [plannedTodayCount, closedThisMonthCount, orderRows] = await Promise.all([
    prisma.maintenanceLog.count({
      where: {
        technicianId,
        OR: [
          { date: { gte: todayStart, lte: todayEnd } },
          { workflowStatus: MaintenanceWorkflowStatus.OPEN, date: { lte: todayEnd } },
        ],
      },
    }),
    prisma.maintenanceLog.count({
      where: {
        technicianId,
        workflowStatus: MaintenanceWorkflowStatus.COMPLETED,
        date: { gte: monthStart },
      },
    }),
    prisma.maintenanceOrder.findMany({
      where: { status: MaintenanceOrderStatus.ACTIVE },
      orderBy: { plannedDate: "asc" },
      take: 5,
      select: {
        id: true,
        reference: true,
        plannedDate: true,
        interventionType: true,
        status: true,
        lines: {
          where: { maintenanceLog: { is: null } },
          select: { id: true, machine: { select: { name: true } } },
        },
      },
    }),
  ]);

  const upcomingOrders: TechnicianUpcomingOm[] = orderRows.map((o) => ({
    id: o.id,
    reference: o.reference,
    plannedDate: o.plannedDate.toISOString(),
    plannedDateLabel: formatDateFrShort(o.plannedDate.toISOString()),
    interventionType: interventionTypeFr(o.interventionType),
    statusLabel: maintenanceOrderStatusFr(o.status),
    machineNames: o.lines.map((l) => l.machine.name).join(", ") || "—",
    pendingLines: o.lines.length,
  }));

  return {
    plannedTodayCount,
    closedThisMonthCount,
    upcomingOrders,
  };
}

export function getTechnicianDashboardDataCached(technicianId: string) {
  return unstable_cache(
    () => fetchTechnicianDashboardData(technicianId),
    [CACHE_TAGS.dashboard, "technician-dashboard", technicianId],
    { revalidate: 60, tags: [CACHE_TAGS.dashboard, CACHE_TAGS.interventions, CACHE_TAGS.maintenanceOrders] },
  )();
}
