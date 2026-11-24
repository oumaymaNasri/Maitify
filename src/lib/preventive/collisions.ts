import type { CollisionGroup, ComputedOccurrence } from "@/lib/preventive/types";

/**
 * Collisions autorisées : plusieurs occurrences même machine / même créneau.
 * Détection soft pour alertes UI (Lot 5/6) — ne fusionne ni n'élimine.
 */
export function detectOccurrenceCollisions(
  occurrences: ComputedOccurrence[],
  options?: { durationWarnThresholdMin?: number },
): CollisionGroup[] {
  const map = new Map<string, ComputedOccurrence[]>();

  for (const occ of occurrences) {
    if (!occ.plannedDate || !occ.plannedTime) continue;
    if (occ.status === "SKIPPED") continue;
    const machineId = occ.machineId ?? "__unknown__";
    const key = `${machineId}|${occ.plannedDate}|${occ.plannedTime}`;
    const list = map.get(key) ?? [];
    list.push(occ);
    map.set(key, list);
  }

  const groups: CollisionGroup[] = [];
  for (const [, list] of map) {
    if (list.length < 2) continue;
    const machineId = list[0]!.machineId ?? "__unknown__";
    const totalDurationMin = list.reduce((sum, o) => sum + (o.estimatedDurationMin ?? 0), 0);
    groups.push({
      machineId,
      plannedDate: list[0]!.plannedDate!,
      plannedTime: list[0]!.plannedTime!,
      occurrenceKeys: list.map((o) => o.occurrenceKey),
      totalDurationMin,
    });
  }

  const threshold = options?.durationWarnThresholdMin;
  if (threshold != null) {
    return groups.filter((g) => g.occurrenceKeys.length >= 2 || g.totalDurationMin >= threshold);
  }
  return groups;
}

/** Vérifie l'unicité des occurrenceKey (anti-doublons moteur). */
export function assertUniqueOccurrenceKeys(occurrences: ComputedOccurrence[]): {
  ok: boolean;
  duplicates: string[];
} {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const occ of occurrences) {
    if (seen.has(occ.occurrenceKey)) duplicates.push(occ.occurrenceKey);
    else seen.add(occ.occurrenceKey);
  }
  return { ok: duplicates.length === 0, duplicates };
}
