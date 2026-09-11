import {
  AlertSeverity,
  AlertType,
  type Prisma,
  type WaterQualityMeasurement,
  type WaterQualityThreshold,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

import { evaluateWaterQuality } from "@/lib/water-quality/evaluate-thresholds";

/**
 * Si la mesure est hors seuils pour sa zone : crée une alerte GMAO immédiate (dashboard / revalidation).
 */
export async function persistWaterQualityAlertIfOutOfBounds(
  measurement: Pick<WaterQualityMeasurement, "zone" | "measuredAt" | "ph" | "th" | "conductivity" | "ta" | "tac" | "cl">,
): Promise<void> {
  const threshold = await prisma.waterQualityThreshold.findUnique({
    where: { zone: measurement.zone },
  });
  if (!threshold) return;

  const level = evaluateWaterQuality(measurement, threshold);
  if (level !== "danger") return;

  const summary = describeOutOfSpec(measurement, threshold);

  await prisma.gmaoAlert.create({
    data: {
      type: AlertType.WATER_QUALITY,
      severity: AlertSeverity.CRITICAL,
      title: `Qualité eau — ${measurement.zone} hors normes`,
      message: `${summary} (mesure du ${measurement.measuredAt.toISOString()}).`,
      metadata: {
        zone: measurement.zone,
        measuredAt: measurement.measuredAt.toISOString(),
      } as Prisma.InputJsonValue,
    },
  });
}

function describeOutOfSpec(
  m: Pick<WaterQualityMeasurement, "ph" | "th" | "conductivity" | "ta" | "tac" | "cl">,
  t: WaterQualityThreshold,
): string {
  const parts: string[] = [];
  const check = (label: string, v: number | null | undefined, min: number | null | undefined, max: number | null | undefined) => {
    if (v == null) return;
    if (min != null && v < min) parts.push(`${label} trop bas (${v}<${min})`);
    if (max != null && v > max) parts.push(`${label} trop haut (${v}>${max})`);
  };
  check("pH", m.ph, t.phMin, t.phMax);
  check("TH", m.th, t.thMin, t.thMax);
  check("Conductivité", m.conductivity, t.conductivityMin, t.conductivityMax);
  check("TA", m.ta, t.taMin, t.taMax);
  check("TAC", m.tac, t.tacMin, t.tacMax);
  check("Cl", m.cl, t.clMin, t.clMax);
  return parts.length ? parts.join(" ; ") : "Paramètre(s) hors plage configurée.";
}
