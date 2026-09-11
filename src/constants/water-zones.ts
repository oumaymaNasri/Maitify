import type { WaterZone } from "@prisma/client";

/** Libellés terrain (CDC NutriFish + zones Bâche / Chaudière) */
export const WATER_ZONE_LABELS: Record<WaterZone, string> = {
  EAU_ADOUC_IE: "Eau adoucie",
  BACHE_1: "Bâche 1",
  BACHE_2: "Bâche 2",
  EAU_CHAUDIERE: "Eau chaudière",
  RETOUR_CONDENSAT: "Retour condensat",
};
