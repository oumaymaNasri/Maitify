import type { WaterQualityMeasurement, WaterQualityThreshold } from "@prisma/client";

export type WaterQualityAlertLevel = "ok" | "danger";

/**
 * Retourne le niveau d'alerte pour une mesure et les seuils de sa zone.
 * Hors plage = alerte rouge (danger), conforme au besoin mobile terrain.
 */
export function evaluateWaterQuality(
  m: Pick<WaterQualityMeasurement, "ph" | "th" | "conductivity" | "ta" | "tac" | "cl">,
  t: WaterQualityThreshold | null,
): WaterQualityAlertLevel {
  if (!t) return "ok";

  const checks: boolean[] = [];

  if (m.ph != null) {
    if (t.phMin != null) checks.push(m.ph >= t.phMin);
    if (t.phMax != null) checks.push(m.ph <= t.phMax);
  }
  if (m.th != null) {
    if (t.thMin != null) checks.push(m.th >= t.thMin);
    if (t.thMax != null) checks.push(m.th <= t.thMax);
  }
  if (m.ta != null) {
    if (t.taMin != null) checks.push(m.ta >= t.taMin);
    if (t.taMax != null) checks.push(m.ta <= t.taMax);
  }
  if (m.tac != null) {
    if (t.tacMin != null) checks.push(m.tac >= t.tacMin);
    if (t.tacMax != null) checks.push(m.tac <= t.tacMax);
  }
  if (m.cl != null) {
    if (t.clMin != null) checks.push(m.cl >= t.clMin);
    if (t.clMax != null) checks.push(m.cl <= t.clMax);
  }
  if (m.conductivity != null) {
    if (t.conductivityMin != null) checks.push(m.conductivity >= t.conductivityMin);
    if (t.conductivityMax != null) checks.push(m.conductivity <= t.conductivityMax);
  }

  if (checks.length === 0) return "ok";
  return checks.every(Boolean) ? "ok" : "danger";
}
