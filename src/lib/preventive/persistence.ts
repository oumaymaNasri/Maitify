import { prisma } from "@/lib/db/prisma";

/**
 * Sonde en lecture seule : tables Lot 1 présentes ?
 * Ne crée / ne modifie aucune donnée.
 */
export async function isPreventivePersistenceReady(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1 FROM "MaintenanceType" LIMIT 1`;
    return true;
  } catch {
    return false;
  }
}

export const PERSISTENCE_DISABLED_MESSAGE =
  "Persistance PostgreSQL indisponible : la migration du Lot 1 n'est pas appliquée. La prévisualisation reste disponible ; création, modification et activation sont bloquées.";

export const PERSISTENCE_WRITE_BLOCKED_CODE = "PERSISTENCE_UNAVAILABLE" as const;
