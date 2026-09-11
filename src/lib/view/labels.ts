import { InterventionType, type WaterZone } from "@prisma/client";

export function interventionTypeFr(t: InterventionType): string {
  switch (t) {
    case "CORRECTIVE":
      return "Corrective";
    case "PREVENTIVE":
      return "Préventive";
    case "AMELIORATION":
      return "Amélioration";
    default:
      return t;
  }
}

export function waterZoneFr(zone: WaterZone): string {
  const map: Record<WaterZone, string> = {
    EAU_ADOUC_IE: "Eau adoucie",
    BACHE_1: "Bâche 1",
    BACHE_2: "Bâche 2",
    EAU_CHAUDIERE: "Eau chaudière",
    RETOUR_CONDENSAT: "Retour condensat",
  };
  return map[zone];
}
