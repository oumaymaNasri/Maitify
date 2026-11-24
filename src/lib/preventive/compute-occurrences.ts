import { assertUniqueOccurrenceKeys } from "@/lib/preventive/collisions";
import { computeAutomaticOccurrences } from "@/lib/preventive/schedule-automatic";
import { computeFixedOccurrences } from "@/lib/preventive/schedule-fixed";
import type {
  ComputeOccurrencesResult,
  ComputedOccurrence,
  HorizonInput,
  OccurrenceStats,
  PlanScheduleInput,
} from "@/lib/preventive/types";

export function computeOccurrenceStats(occurrences: ComputedOccurrence[]): OccurrenceStats {
  let skipped = 0;
  let rescheduled = 0;
  let generatable = 0;
  for (const o of occurrences) {
    if (o.status === "SKIPPED" || o.sundayAdjustment === "SKIP") {
      skipped += 1;
      continue;
    }
    if (o.sundayAdjustment === "PREV_SATURDAY" || o.sundayAdjustment === "NEXT_MONDAY") {
      rescheduled += 1;
    }
    if (o.plannedDate) generatable += 1;
  }
  return {
    theoretical: occurrences.length,
    skipped,
    rescheduled,
    generatable,
  };
}

/**
 * Point d'entrée unique du moteur (prévisualisation = même fonction, sans I/O).
 * Plans SUSPENDED / ARCHIVED → liste vide (pas de génération).
 */
export function computeOccurrences(
  plan: PlanScheduleInput,
  horizon: HorizonInput,
): ComputeOccurrencesResult {
  if (plan.status !== "ACTIVE") {
    return { occurrences: [], stats: { theoretical: 0, skipped: 0, rescheduled: 0, generatable: 0 } };
  }

  if (plan.occurrencesPerPeriod < 1) {
    throw new Error("occurrencesPerPeriod doit être ≥ 1.");
  }

  const occurrences =
    plan.scheduleMode === "FIXED"
      ? computeFixedOccurrences(plan, horizon)
      : computeAutomaticOccurrences(plan, horizon);

  const uniqueness = assertUniqueOccurrenceKeys(occurrences);
  if (!uniqueness.ok) {
    throw new Error(`Clés d'occurrence en doublon: ${uniqueness.duplicates.slice(0, 5).join(", ")}`);
  }

  return {
    occurrences,
    stats: computeOccurrenceStats(occurrences),
  };
}

/** Alias sémantique pour l'UI de prévisualisation (aucune écriture). */
export function previewOccurrences(
  plan: PlanScheduleInput,
  horizon: HorizonInput,
): ComputeOccurrencesResult {
  return computeOccurrences(plan, horizon);
}

/** Deux appels identiques → mêmes clés (idempotence pure). */
export function isDeterministic(plan: PlanScheduleInput, horizon: HorizonInput): boolean {
  const a = computeOccurrences(plan, horizon).occurrences.map((o) => o.occurrenceKey);
  const b = computeOccurrences(plan, horizon).occurrences.map((o) => o.occurrenceKey);
  if (a.length !== b.length) return false;
  return a.every((k, i) => k === b[i]);
}
