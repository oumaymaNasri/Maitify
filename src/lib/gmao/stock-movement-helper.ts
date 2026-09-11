import type { Prisma } from "@prisma/client";

export async function createStockMovementFromIntervention(
  tx: Prisma.TransactionClient,
  partId: string,
  quantity: number,
  maintenanceLogId: string,
  interventionRef?: string,
) {
  await tx.stockMovement.create({
    data: {
      partId,
      type: "SORTIE",
      quantity,
      motif: interventionRef
        ? `Utilisée dans intervention ${interventionRef}`
        : `Utilisée dans intervention ${maintenanceLogId.slice(0, 8)}`,
    },
  });
}
