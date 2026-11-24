export {
  PREVENTIVE_TIMEZONE,
  DEFAULT_WORKING_WEEKDAYS,
  TIME_LOCAL_REGEX,
  buildOccurrenceKey,
  MAINTENANCE_TYPE_SEED_CODES,
  TYPE_CODE_TO_OM_TASK_FLAGS,
} from "@/lib/preventive/constants";

export {
  preventiveFrequencyFr,
  preventiveScheduleModeFr,
  sundayPolicyFr,
  preventivePlanStatusFr,
  occurrenceStatusFr,
} from "@/lib/preventive/labels";

export {
  parseCivilDate,
  formatCivilDate,
  isLeapYear,
  daysInMonth,
  clampCivilDay,
  addDays,
  weekdayMon1,
  isWorkingDay,
  workingWeekdays,
  periodKeyDaily,
  periodKeyWeekly,
  periodKeyMonthly,
  periodKeyYearly,
  plannedAtUtcIso,
  isoWeekParts,
  startOfIsoWeek,
} from "@/lib/preventive/calendar";

export { applySundayPolicy } from "@/lib/preventive/sunday-policy";
export { computeFixedOccurrences, weekdayOf } from "@/lib/preventive/schedule-fixed";
export { computeAutomaticOccurrences, selectUniformIndices } from "@/lib/preventive/schedule-automatic";
export {
  computeOccurrences,
  previewOccurrences,
  computeOccurrenceStats,
  isDeterministic,
} from "@/lib/preventive/compute-occurrences";
export { detectOccurrenceCollisions, assertUniqueOccurrenceKeys } from "@/lib/preventive/collisions";

export type * from "@/lib/preventive/types";

export {
  formValuesToPlanScheduleInput,
  defaultPreviewHorizon,
  addDaysIso,
  todayTunisApprox,
} from "@/lib/preventive/preview-adapter";
export type { PreventivePlanFormValues } from "@/lib/preventive/preview-adapter";
export { designMaintenanceTypeOptions, DESIGN_MAINTENANCE_TYPES } from "@/lib/preventive/catalog";
export {
  isPreventivePersistenceReady,
  PERSISTENCE_DISABLED_MESSAGE,
  PERSISTENCE_WRITE_BLOCKED_CODE,
} from "@/lib/preventive/persistence";
