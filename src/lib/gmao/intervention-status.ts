import { InterventionType, MaintenanceWorkflowStatus } from "@prisma/client";

const TZ = "Africa/Tunis";

export function calendarDayKey(date: Date, timeZone = TZ): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export const HISTORICAL_CLOSE_THROUGH = "2026-08-08";

export function interventionIdentityKey(machineId: string, date: Date, type: InterventionType | string): string {
  return `${machineId}|${calendarDayKey(date)}|${type}`;
}

/** Minuit UTC du jour calendaire (Tunis), pour comparer aux dates Excel importées. */
export function startOfTodayTunis(now = new Date()): Date {
  return new Date(`${calendarDayKey(now)}T00:00:00.000Z`);
}

/** Corrective (et amélioration) : déjà faite → clôturée. Préventive future (> jour J) : à faire. */
export function workflowStatusForLog(
  type: InterventionType,
  date: Date,
  now = new Date(),
): MaintenanceWorkflowStatus {
  if (type === InterventionType.PREVENTIVE && calendarDayKey(date) > calendarDayKey(now)) {
    return MaintenanceWorkflowStatus.OPEN;
  }
  return MaintenanceWorkflowStatus.COMPLETED;
}

export function workflowStatusWhere(
  status: MaintenanceWorkflowStatus,
  now = new Date(),
): { type?: InterventionType; date?: { gt: Date } | { lte: Date }; OR?: object[] } {
  const start = startOfTodayTunis(now);
  if (status === MaintenanceWorkflowStatus.OPEN) {
    return { type: InterventionType.PREVENTIVE, date: { gt: start } };
  }
  return {
    OR: [{ type: { not: InterventionType.PREVENTIVE } }, { type: InterventionType.PREVENTIVE, date: { lte: start } }],
  };
}
