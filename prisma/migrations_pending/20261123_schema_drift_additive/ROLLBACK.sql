-- Retrait des objets ajoutés par migration.sql (les valeurs d'enum ajoutées ne peuvent pas être retirées simplement :
-- restaurer backups/nutrifish_gmao_20261123_205448.dump si un retour complet est nécessaire).
BEGIN;
DROP INDEX IF EXISTS "MaintenanceOrder_planned_date_status_idx";
DROP INDEX IF EXISTS "Intervention_maintenance_order_id_date_idx";
DROP INDEX IF EXISTS "Intervention_type_preventive_realized_idx";
DROP INDEX IF EXISTS "Intervention_machineId_date_type_idx";
DROP INDEX IF EXISTS "GmaoAlert_dedupe_key_key";
ALTER TABLE "Technician" DROP COLUMN IF EXISTS "image_url";
ALTER TABLE "MaintenanceOrderLine" DROP COLUMN IF EXISTS "task_controle";
ALTER TABLE "Intervention" DROP COLUMN IF EXISTS "duration_unit", DROP COLUMN IF EXISTS "preventive_realized";
ALTER TABLE "GmaoAlert" DROP COLUMN IF EXISTS "dedupe_key";
DROP TYPE IF EXISTS "DurationUnit";
COMMIT;
