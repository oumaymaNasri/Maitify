import { PREVENTIVE_TIMEZONE } from "@/lib/preventive/constants";
import type { PlanScheduleInput, ScheduleSlotInput } from "@/lib/preventive/types";

/** Valeurs formulaire UI (dates string YYYY-MM-DD). */
export type PreventivePlanFormValues = {
  planId?: string;
  planVersion?: number;
  machineId: string;
  maintenanceTypeId: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  frequency: PlanScheduleInput["frequency"];
  occurrencesPerPeriod: number;
  scheduleMode: PlanScheduleInput["scheduleMode"];
  includeSunday: boolean;
  sundayPolicy: PlanScheduleInput["sundayPolicy"];
  startDate: string;
  endDate?: string | null;
  estimatedDurationMin?: number | null;
  assigneeTechnicianId?: string | null;
  status: PlanScheduleInput["status"];
  defaultTimes: string[];
  scheduleRules: ScheduleSlotInput[];
  generationHorizonDays?: number;
};

export function formValuesToPlanScheduleInput(values: PreventivePlanFormValues): PlanScheduleInput {
  return {
    planId: values.planId?.trim() || "preview-draft",
    planVersion: values.planVersion ?? 1,
    machineId: values.machineId || undefined,
    frequency: values.frequency,
    occurrencesPerPeriod: values.occurrencesPerPeriod,
    scheduleMode: values.scheduleMode,
    includeSunday: values.includeSunday,
    sundayPolicy: values.sundayPolicy,
    startDate: values.startDate,
    endDate: values.endDate || null,
    status: values.status === "SUSPENDED" || values.status === "ARCHIVED" ? values.status : "ACTIVE",
    timezone: PREVENTIVE_TIMEZONE,
    defaultTimes: values.defaultTimes,
    scheduleRules: values.scheduleRules,
    estimatedDurationMin: values.estimatedDurationMin ?? null,
  };
}

export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function todayTunisApprox(): string {
  // Approximation civile : UTC+1 Tunis sans DST
  const now = new Date();
  const tunis = new Date(now.getTime() + 60 * 60 * 1000);
  return tunis.toISOString().slice(0, 10);
}

export function defaultPreviewHorizon(days = 30): { from: string; to: string } {
  const from = todayTunisApprox();
  return { from, to: addDaysIso(from, Math.max(1, Math.min(days, 366)) - 1) };
}
