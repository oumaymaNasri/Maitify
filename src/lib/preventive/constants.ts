/** Fuseau métier NutriFish — calcul des échéances préventives. */
export const PREVENTIVE_TIMEZONE = "Africa/Tunis" as const;

/** Jours ouvrés par défaut (1=lun … 6=sam). Dimanche = 7 exclu sauf includeSunday. */
export const DEFAULT_WORKING_WEEKDAYS = [1, 2, 3, 4, 5, 6] as const;

export const TIME_LOCAL_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Clé d'idempotence occurrence (Lot 2 / 4) — stable hors version plan. */
export function buildOccurrenceKey(input: {
  planId: string;
  periodKey: string;
  occurrenceIndex: number;
  theoreticalDate: string; // YYYY-MM-DD
  theoreticalTime: string; // HH:mm
}): string {
  return [
    input.planId,
    input.periodKey,
    String(input.occurrenceIndex),
    input.theoreticalDate,
    input.theoreticalTime,
  ].join("|");
}

export const MAINTENANCE_TYPE_SEED_CODES = [
  "CTRL_VISUEL",
  "LUBRIFICATION",
  "NETTOYAGE",
  "HUILE",
  "INSP_MECA",
  "REVISION_GEN",
] as const;

/** Mapping optionnel code type → flags checklist OM (Lot 4). */
export const TYPE_CODE_TO_OM_TASK_FLAGS: Record<
  string,
  Partial<{
    taskNettoyage: boolean;
    taskGraissage: boolean;
    taskHuile: boolean;
    taskControl: boolean;
    taskControle: boolean;
    taskNonConforme: boolean;
  }>
> = {
  NETTOYAGE: { taskNettoyage: true },
  LUBRIFICATION: { taskGraissage: true },
  HUILE: { taskHuile: true },
  CTRL_VISUEL: { taskControle: true },
  INSP_MECA: { taskControle: true, taskControl: true },
};
