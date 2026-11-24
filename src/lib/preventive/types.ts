/** Types purs du moteur d'échéances (Lot 2) — indépendants de Prisma runtime. */

export type PreventiveFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
export type PreventiveScheduleMode = "FIXED" | "AUTOMATIC";
export type SundayReschedulePolicy = "PREV_SATURDAY" | "NEXT_MONDAY" | "SKIP";
export type PreventivePlanStatus = "ACTIVE" | "SUSPENDED" | "ARCHIVED";
export type SundayAdjustment = "NONE" | "PREV_SATURDAY" | "NEXT_MONDAY" | "SKIP";
export type OccurrenceEngineStatus = "PLANNED" | "SKIPPED";

export type CivilDate = {
  y: number;
  m: number; // 1-12
  d: number; // 1-31
};

export type ScheduleSlotInput = {
  /** Rang 0..N-1 */
  sortOrder: number;
  /** 1=lundi … 7=dimanche */
  weekday?: number | null;
  monthDay?: number | null;
  month?: number | null;
  timeLocal: string;
};

export type PlanScheduleInput = {
  planId: string;
  planVersion: number;
  frequency: PreventiveFrequency;
  occurrencesPerPeriod: number;
  scheduleMode: PreventiveScheduleMode;
  includeSunday: boolean;
  sundayPolicy: SundayReschedulePolicy;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD inclusive, optionnel */
  endDate?: string | null;
  status: PreventivePlanStatus;
  timezone?: string;
  defaultTimes: string[];
  scheduleRules: ScheduleSlotInput[];
  /** Durée estimée (minutes) — utilisée pour détection collisions soft */
  estimatedDurationMin?: number | null;
  machineId?: string;
};

export type HorizonInput = {
  /** YYYY-MM-DD inclus */
  from: string;
  /** YYYY-MM-DD inclus */
  to: string;
};

export type ComputedOccurrence = {
  planId: string;
  planVersion: number;
  machineId?: string;
  occurrenceIndex: number;
  periodKey: string;
  theoreticalDate: string;
  theoreticalTime: string;
  plannedDate: string | null;
  plannedTime: string | null;
  plannedAtUtc: string | null;
  sundayAdjustment: SundayAdjustment;
  status: OccurrenceEngineStatus;
  occurrenceKey: string;
  estimatedDurationMin?: number | null;
};

export type OccurrenceStats = {
  theoretical: number;
  skipped: number;
  rescheduled: number;
  generatable: number;
};

export type ComputeOccurrencesResult = {
  occurrences: ComputedOccurrence[];
  stats: OccurrenceStats;
};

export type CollisionGroup = {
  machineId: string;
  plannedDate: string;
  plannedTime: string;
  occurrenceKeys: string[];
  totalDurationMin: number;
};
