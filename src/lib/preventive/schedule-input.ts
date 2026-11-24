import type { PreventiveFrequency, PreventivePlanStatus, PreventiveScheduleMode } from "@prisma/client";

import { PREVENTIVE_TIMEZONE } from "@/lib/preventive/constants";
import type { PlanScheduleInput } from "@/lib/preventive/types";

/** Ligne Prisma (plan + règles) → entrée pure du moteur d'échéances. */
export function toPlanScheduleInput(row: {
  id: string;
  version: number;
  machineId: string;
  frequency: PreventiveFrequency;
  occurrencesPerPeriod: number;
  scheduleMode: PreventiveScheduleMode;
  includeSunday: boolean;
  sundayPolicy: "PREV_SATURDAY" | "NEXT_MONDAY" | "SKIP";
  startDate: Date;
  endDate: Date | null;
  status: PreventivePlanStatus;
  defaultTimes: string[];
  estimatedDurationMin: number | null;
  scheduleRules: {
    sortOrder: number;
    weekday: number | null;
    monthDay: number | null;
    month: number | null;
    timeLocal: string;
  }[];
}): PlanScheduleInput {
  const startDate = row.startDate.toISOString().slice(0, 10);
  return {
    planId: row.id,
    planVersion: row.version,
    machineId: row.machineId,
    frequency: row.frequency,
    occurrencesPerPeriod: row.occurrencesPerPeriod,
    scheduleMode: row.scheduleMode,
    includeSunday: row.includeSunday,
    sundayPolicy: row.sundayPolicy,
    startDate,
    endDate: row.endDate ? row.endDate.toISOString().slice(0, 10) : null,
    status: row.status,
    timezone: PREVENTIVE_TIMEZONE,
    defaultTimes: row.defaultTimes,
    scheduleRules: row.scheduleRules.map((r) => ({
      sortOrder: r.sortOrder,
      weekday: r.weekday,
      monthDay: r.monthDay,
      month: r.month,
      timeLocal: r.timeLocal,
    })),
    estimatedDurationMin: row.estimatedDurationMin,
  };
}
