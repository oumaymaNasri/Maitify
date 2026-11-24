-- =============================================================================
-- Rollback Lot 1 — UNIQUEMENT les objets créés par migration.sql
-- À exécuter manuellement si besoin, APRÈS autorisation.
-- Ne touche pas aux tables métier préexistantes (Machine, Intervention, OM…).
-- =============================================================================

DROP TABLE IF EXISTS "PreventivePlanRevision";
DROP TABLE IF EXISTS "MaintenanceOccurrence";
DROP TABLE IF EXISTS "MaintenanceOrderTask";
DROP TABLE IF EXISTS "MaintenanceScheduleRule";
DROP TABLE IF EXISTS "PreventiveMaintenancePlan";
DROP TABLE IF EXISTS "MaintenanceType";

DROP TYPE IF EXISTS "MaintenanceOrderTaskSource";
DROP TYPE IF EXISTS "MaintenanceOrderTaskStatus";
DROP TYPE IF EXISTS "SundayAdjustment";
DROP TYPE IF EXISTS "MaintenanceOccurrenceStatus";
DROP TYPE IF EXISTS "MaintenanceTypeStatus";
DROP TYPE IF EXISTS "PreventivePlanStatus";
DROP TYPE IF EXISTS "SundayReschedulePolicy";
DROP TYPE IF EXISTS "PreventiveScheduleMode";
DROP TYPE IF EXISTS "PreventiveFrequency";
