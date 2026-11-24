-- Rattrapage additif de la base locale sur schema.prisma (23/11/2026).
-- Généré par `prisma migrate diff` (base -> schéma), SANS la suppression
-- de "MaintenanceOrder"."intervention_type" (colonne conservée : NOT NULL DEFAULT PREVENTIVE).
-- Sauvegarde préalable : backups/nutrifish_gmao_20261123_205448.dump

BEGIN;
-- CreateEnum
CREATE TYPE "DurationUnit" AS ENUM ('PER_MINUTE', 'MAINTENANCE_DAY', 'MASKED_TIME');

-- AlterEnum
ALTER TYPE "AlertType" ADD VALUE 'PREVENTIVE_REMINDER';

-- AlterEnum
ALTER TYPE "FailureCause" ADD VALUE 'ENTRETIEN_MACHINE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InterventionType" ADD VALUE 'PREDICTIVE';
ALTER TYPE "InterventionType" ADD VALUE 'AUTONOME';

-- AlterEnum
ALTER TYPE "MaintenanceFrequency" ADD VALUE 'PAR_POSTE';

-- AlterEnum
ALTER TYPE "OperationType" ADD VALUE 'CHANGEMENT';

-- AlterTable
ALTER TABLE "GmaoAlert" ADD COLUMN     "dedupe_key" TEXT;

-- AlterTable
ALTER TABLE "Intervention" ADD COLUMN     "duration_unit" "DurationUnit" DEFAULT 'PER_MINUTE',
ADD COLUMN     "preventive_realized" BOOLEAN;

-- AlterTable

-- AlterTable
ALTER TABLE "MaintenanceOrderLine" ADD COLUMN     "task_controle" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Technician" ADD COLUMN     "image_url" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "GmaoAlert_dedupe_key_key" ON "GmaoAlert"("dedupe_key");

-- CreateIndex
CREATE INDEX "Intervention_machineId_date_type_idx" ON "Intervention"("machineId", "date", "type");

-- CreateIndex
CREATE INDEX "Intervention_type_preventive_realized_idx" ON "Intervention"("type", "preventive_realized");

-- CreateIndex
CREATE INDEX "Intervention_maintenance_order_id_date_idx" ON "Intervention"("maintenance_order_id", "date");

-- CreateIndex
CREATE INDEX "MaintenanceOrder_planned_date_status_idx" ON "MaintenanceOrder"("planned_date", "status");


COMMIT;
