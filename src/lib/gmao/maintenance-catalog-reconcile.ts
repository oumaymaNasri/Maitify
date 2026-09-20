import {
  MaintenanceOrderStatus,
  MaintenanceWorkflowStatus,
  type InterventionType,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";

import { calendarDayKey, HISTORICAL_CLOSE_THROUGH, interventionIdentityKey } from "@/lib/gmao/intervention-status";
import { dayBounds, syncDailyMaintenanceOrders } from "@/lib/gmao/maintenance-order-from-logs";

type Db = PrismaClient | Prisma.TransactionClient;

export { HISTORICAL_CLOSE_THROUGH };

export async function loadExistingInterventionKeys(db: Db): Promise<Set<string>> {
  const rows = await db.maintenanceLog.findMany({
    select: { machineId: true, date: true, type: true },
  });
  return new Set(rows.map((r) => interventionIdentityKey(r.machineId, r.date, r.type)));
}

export async function dedupeMaintenanceLogs(db: Db): Promise<{ kept: number; removed: number }> {
  const logs = await db.maintenanceLog.findMany({
    select: {
      id: true,
      machineId: true,
      date: true,
      type: true,
      createdAt: true,
      maintenanceOrderLineId: true,
      durationMinutes: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const keep = new Map<string, (typeof logs)[number]>();
  const extras: string[] = [];

  for (const log of logs) {
    const key = interventionIdentityKey(log.machineId, log.date, log.type);
    const current = keep.get(key);
    if (!current) {
      keep.set(key, log);
      continue;
    }
    const currentScore = (current.maintenanceOrderLineId ? 2 : 0) + (current.durationMinutes ? 1 : 0);
    const nextScore = (log.maintenanceOrderLineId ? 2 : 0) + (log.durationMinutes ? 1 : 0);
    if (nextScore > currentScore) {
      extras.push(current.id);
      keep.set(key, log);
    } else {
      extras.push(log.id);
    }
  }

  for (let i = 0; i < extras.length; i += 200) {
    await db.maintenanceLog.deleteMany({ where: { id: { in: extras.slice(i, i + 200) } } });
  }

  return { kept: keep.size, removed: extras.length };
}

export async function closeOrdersInPeriod(
  db: Db,
  input: { fromDayKey?: string | null; toDayKey: string },
): Promise<{ orders: number; logs: number }> {
  const toDayKey = input.toDayKey;
  const fromDayKey = input.fromDayKey?.trim() || null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(toDayKey)) {
    throw new Error("Date de fin invalide.");
  }
  if (fromDayKey && !/^\d{4}-\d{2}-\d{2}$/.test(fromDayKey)) {
    throw new Error("Date de début invalide.");
  }
  if (fromDayKey && fromDayKey > toDayKey) {
    throw new Error("La date de début doit précéder la date de fin.");
  }

  const orders = await db.maintenanceOrder.findMany({
    select: { id: true, dayKey: true, plannedDate: true },
  });
  const ids = orders
    .filter((order) => {
      const key = order.dayKey ?? calendarDayKey(order.plannedDate);
      if (key > toDayKey) return false;
      if (fromDayKey && key < fromDayKey) return false;
      return true;
    })
    .map((order) => order.id);

  let ordersUpdated = 0;
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const result = await db.maintenanceOrder.updateMany({
      where: { id: { in: chunk }, status: { not: MaintenanceOrderStatus.COMPLETED } },
      data: { status: MaintenanceOrderStatus.COMPLETED },
    });
    ordersUpdated += result.count;
  }

  const end = new Date(`${toDayKey}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  const start = fromDayKey ? new Date(`${fromDayKey}T00:00:00.000Z`) : undefined;

  const dateWhere = { date: { ...(start ? { gte: start } : {}), lt: end } };
  const logsResult = await db.maintenanceLog.updateMany({
    where: {
      workflowStatus: { not: MaintenanceWorkflowStatus.COMPLETED },
      OR: ids.length ? [{ maintenanceOrderId: { in: ids } }, dateWhere] : [dateWhere],
    },
    data: { workflowStatus: MaintenanceWorkflowStatus.COMPLETED },
  });

  return { orders: ordersUpdated, logs: logsResult.count };
}

export async function reconcileMaintenanceCatalog(db: PrismaClient): Promise<{
  kept: number;
  removed: number;
  linked: number;
  closedOrders: number;
}> {
  const dedupe = await dedupeMaintenanceLogs(db);
  const om = await syncDailyMaintenanceOrders(db);
  const closed = await closeOrdersInPeriod(db, { toDayKey: HISTORICAL_CLOSE_THROUGH });
  return {
    kept: dedupe.kept,
    removed: dedupe.removed,
    linked: om.linked,
    closedOrders: closed.orders,
  };
}

export const CLOSED_ORDER_MESSAGE =
  "Cet ordre de maintenance est clôturé. Les interventions rattachées ne peuvent plus être modifiées.";

export async function findExistingIntervention(
  db: Db,
  input: { machineId: string; date: Date; type: InterventionType; excludeId?: string },
) {
  const { start, end } = dayBounds(calendarDayKey(input.date));
  return db.maintenanceLog.findFirst({
    where: {
      machineId: input.machineId,
      type: input.type,
      date: { gte: start, lt: end },
      ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
    },
    select: { id: true },
  });
}

export async function assertDailyOrderWritable(db: Db, date: Date) {
  const dayKey = calendarDayKey(date);
  const order = await db.maintenanceOrder.findFirst({
    where: { OR: [{ dayKey }, { reference: `OM-${dayKey}` }] },
    select: { status: true, reference: true },
  });
  if (order?.status === MaintenanceOrderStatus.COMPLETED) {
    throw new Error(CLOSED_ORDER_MESSAGE);
  }
}

export async function assertOrderWritableById(db: Db, orderId: string) {
  const order = await db.maintenanceOrder.findUnique({
    where: { id: orderId },
    select: { status: true, reference: true },
  });
  if (!order) throw new Error("Ordre introuvable.");
  if (order.status === MaintenanceOrderStatus.COMPLETED) {
    throw new Error(CLOSED_ORDER_MESSAGE);
  }
}

export async function assertLogWritable(db: Db, logId: string) {
  const log = await db.maintenanceLog.findUnique({
    where: { id: logId },
    select: {
      date: true,
      maintenanceOrder: { select: { status: true, reference: true } },
    },
  });
  if (!log) throw new Error("Intervention introuvable.");
  if (log.maintenanceOrder?.status === MaintenanceOrderStatus.COMPLETED) {
    throw new Error(CLOSED_ORDER_MESSAGE);
  }
  await assertDailyOrderWritable(db, log.date);
}
