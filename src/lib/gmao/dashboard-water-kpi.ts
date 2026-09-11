import { AlertType } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { evaluateWaterQuality } from "@/lib/water-quality/evaluate-thresholds";

export async function getWaterQualityKpiCounts(): Promise<{
  zonesHorsNorme: number;
  alertesOuvertes: number;
}> {
  const [thresholds, alertesOuvertes] = await Promise.all([
    prisma.waterQualityThreshold.findMany(),
    prisma.gmaoAlert.count({ where: { type: AlertType.WATER_QUALITY, resolvedAt: null } }),
  ]);

  let zonesHorsNorme = 0;
  await Promise.all(
    thresholds.map(async (t) => {
      const m = await prisma.waterQualityMeasurement.findFirst({
        where: { zone: t.zone },
        orderBy: { measuredAt: "desc" },
        select: { ph: true, th: true, conductivity: true, ta: true, tac: true, cl: true },
      });
      if (!m) return;
      if (evaluateWaterQuality(m, t) === "danger") zonesHorsNorme += 1;
    }),
  );

  return { zonesHorsNorme, alertesOuvertes };
}
