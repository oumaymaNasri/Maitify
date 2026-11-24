-- =============================================================================
-- Lot 1 — Planning préventif (ADDITIVE ONLY)
-- Statut : PRÉPARÉE — NON APPLIQUÉE
-- Fuseau métier : Africa/Tunis
--
-- Interdictions respectées :
--   - Pas de DROP TABLE / TRUNCATE / DROP DATABASE
--   - Pas de suppression de colonnes existantes
--   - Unicité MaintenanceOrderLine (maintenance_order_id, machine_id) CONSERVÉE
--
-- Prérequis avant application (autorisation explicite requise) :
--   1. Sauvegarde pg_dump vérifiée + restore isolé OK
--   2. Revue de ce SQL
--   3. Application sur base de test puis validation
--
-- Rollback (manuel) : supprimer uniquement les objets créés ci-dessous,
-- dans l'ordre inverse des FK (voir docs/RAPPORT_LOT1_PLANNING_PREVENTIF_GMAO.md).
-- =============================================================================

-- ——— Enums ———
CREATE TYPE "PreventiveFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');
CREATE TYPE "PreventiveScheduleMode" AS ENUM ('FIXED', 'AUTOMATIC');
CREATE TYPE "SundayReschedulePolicy" AS ENUM ('PREV_SATURDAY', 'NEXT_MONDAY', 'SKIP');
CREATE TYPE "PreventivePlanStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE "MaintenanceTypeStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "MaintenanceOccurrenceStatus" AS ENUM ('PLANNED', 'GENERATED', 'DONE', 'OVERDUE', 'SKIPPED', 'CANCELLED', 'RESCHEDULED');
CREATE TYPE "SundayAdjustment" AS ENUM ('NONE', 'PREV_SATURDAY', 'NEXT_MONDAY', 'SKIP');
CREATE TYPE "MaintenanceOrderTaskStatus" AS ENUM ('OPEN', 'DONE', 'CANCELLED');
CREATE TYPE "MaintenanceOrderTaskSource" AS ENUM ('MANUAL', 'PREVENTIVE_PLAN');

-- ——— MaintenanceType ———
CREATE TABLE "MaintenanceType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "default_instructions" TEXT,
    "default_duration_min" INTEGER,
    "required_specialty" "TechnicianSpecialty",
    "status" "MaintenanceTypeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MaintenanceType_code_key" ON "MaintenanceType"("code");
CREATE INDEX "MaintenanceType_status_idx" ON "MaintenanceType"("status");
CREATE INDEX "MaintenanceType_label_idx" ON "MaintenanceType"("label");

-- ——— PreventiveMaintenancePlan ———
CREATE TABLE "PreventiveMaintenancePlan" (
    "id" TEXT NOT NULL,
    "machine_id" TEXT NOT NULL,
    "maintenance_type_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "frequency" "PreventiveFrequency" NOT NULL,
    "occurrences_per_period" INTEGER NOT NULL,
    "schedule_mode" "PreventiveScheduleMode" NOT NULL,
    "include_sunday" BOOLEAN NOT NULL DEFAULT false,
    "sunday_policy" "SundayReschedulePolicy" NOT NULL DEFAULT 'NEXT_MONDAY',
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "estimated_duration_min" INTEGER,
    "assignee_technician_id" TEXT,
    "status" "PreventivePlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Tunis',
    "default_times" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "generation_horizon_days" INTEGER NOT NULL DEFAULT 30,
    "last_generated_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreventiveMaintenancePlan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PreventiveMaintenancePlan_machine_id_status_idx" ON "PreventiveMaintenancePlan"("machine_id", "status");
CREATE INDEX "PreventiveMaintenancePlan_maintenance_type_id_idx" ON "PreventiveMaintenancePlan"("maintenance_type_id");
CREATE INDEX "PreventiveMaintenancePlan_status_idx" ON "PreventiveMaintenancePlan"("status");
CREATE INDEX "PreventiveMaintenancePlan_frequency_idx" ON "PreventiveMaintenancePlan"("frequency");
CREATE INDEX "PreventiveMaintenancePlan_assignee_technician_id_idx" ON "PreventiveMaintenancePlan"("assignee_technician_id");

ALTER TABLE "PreventiveMaintenancePlan"
  ADD CONSTRAINT "PreventiveMaintenancePlan_machine_id_fkey"
  FOREIGN KEY ("machine_id") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PreventiveMaintenancePlan"
  ADD CONSTRAINT "PreventiveMaintenancePlan_maintenance_type_id_fkey"
  FOREIGN KEY ("maintenance_type_id") REFERENCES "MaintenanceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PreventiveMaintenancePlan"
  ADD CONSTRAINT "PreventiveMaintenancePlan_assignee_technician_id_fkey"
  FOREIGN KEY ("assignee_technician_id") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PreventiveMaintenancePlan"
  ADD CONSTRAINT "PreventiveMaintenancePlan_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PreventiveMaintenancePlan"
  ADD CONSTRAINT "PreventiveMaintenancePlan_updated_by_user_id_fkey"
  FOREIGN KEY ("updated_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ——— MaintenanceScheduleRule ———
CREATE TABLE "MaintenanceScheduleRule" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "weekday" INTEGER,
    "month_day" INTEGER,
    "month" INTEGER,
    "time_local" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceScheduleRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MaintenanceScheduleRule_plan_id_sort_order_key" ON "MaintenanceScheduleRule"("plan_id", "sort_order");
CREATE INDEX "MaintenanceScheduleRule_plan_id_idx" ON "MaintenanceScheduleRule"("plan_id");

ALTER TABLE "MaintenanceScheduleRule"
  ADD CONSTRAINT "MaintenanceScheduleRule_plan_id_fkey"
  FOREIGN KEY ("plan_id") REFERENCES "PreventiveMaintenancePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ——— MaintenanceOrderTask (sous ligne OM — unicité ligne machine conservée) ———
CREATE TABLE "MaintenanceOrderTask" (
    "id" TEXT NOT NULL,
    "maintenance_order_line_id" TEXT NOT NULL,
    "maintenance_type_id" TEXT,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "planned_time" TEXT,
    "estimated_duration_min" INTEGER,
    "assignee_technician_id" TEXT,
    "status" "MaintenanceOrderTaskStatus" NOT NULL DEFAULT 'OPEN',
    "source" "MaintenanceOrderTaskSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceOrderTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MaintenanceOrderTask_maintenance_order_line_id_idx" ON "MaintenanceOrderTask"("maintenance_order_line_id");
CREATE INDEX "MaintenanceOrderTask_maintenance_type_id_idx" ON "MaintenanceOrderTask"("maintenance_type_id");
CREATE INDEX "MaintenanceOrderTask_assignee_technician_id_idx" ON "MaintenanceOrderTask"("assignee_technician_id");
CREATE INDEX "MaintenanceOrderTask_status_idx" ON "MaintenanceOrderTask"("status");

ALTER TABLE "MaintenanceOrderTask"
  ADD CONSTRAINT "MaintenanceOrderTask_maintenance_order_line_id_fkey"
  FOREIGN KEY ("maintenance_order_line_id") REFERENCES "MaintenanceOrderLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MaintenanceOrderTask"
  ADD CONSTRAINT "MaintenanceOrderTask_maintenance_type_id_fkey"
  FOREIGN KEY ("maintenance_type_id") REFERENCES "MaintenanceType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MaintenanceOrderTask"
  ADD CONSTRAINT "MaintenanceOrderTask_assignee_technician_id_fkey"
  FOREIGN KEY ("assignee_technician_id") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ——— MaintenanceOccurrence ———
CREATE TABLE "MaintenanceOccurrence" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "plan_version" INTEGER NOT NULL,
    "occurrence_key" TEXT NOT NULL,
    "period_key" TEXT NOT NULL,
    "occurrence_index" INTEGER NOT NULL,
    "theoretical_date" DATE NOT NULL,
    "theoretical_time" TEXT NOT NULL,
    "planned_date" DATE,
    "planned_time" TEXT,
    "planned_at_utc" TIMESTAMP(3),
    "sunday_adjustment" "SundayAdjustment" NOT NULL DEFAULT 'NONE',
    "status" "MaintenanceOccurrenceStatus" NOT NULL DEFAULT 'PLANNED',
    "maintenance_order_id" TEXT,
    "maintenance_order_task_id" TEXT,
    "maintenance_log_id" TEXT,
    "completed_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceOccurrence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MaintenanceOccurrence_occurrence_key_key" ON "MaintenanceOccurrence"("occurrence_key");
CREATE UNIQUE INDEX "MaintenanceOccurrence_maintenance_order_task_id_key" ON "MaintenanceOccurrence"("maintenance_order_task_id");
CREATE UNIQUE INDEX "MaintenanceOccurrence_maintenance_log_id_key" ON "MaintenanceOccurrence"("maintenance_log_id");
CREATE INDEX "MaintenanceOccurrence_plan_id_planned_date_idx" ON "MaintenanceOccurrence"("plan_id", "planned_date");
CREATE INDEX "MaintenanceOccurrence_status_planned_date_idx" ON "MaintenanceOccurrence"("status", "planned_date");
CREATE INDEX "MaintenanceOccurrence_maintenance_order_id_idx" ON "MaintenanceOccurrence"("maintenance_order_id");
CREATE INDEX "MaintenanceOccurrence_theoretical_date_idx" ON "MaintenanceOccurrence"("theoretical_date");
CREATE INDEX "MaintenanceOccurrence_period_key_idx" ON "MaintenanceOccurrence"("period_key");

ALTER TABLE "MaintenanceOccurrence"
  ADD CONSTRAINT "MaintenanceOccurrence_plan_id_fkey"
  FOREIGN KEY ("plan_id") REFERENCES "PreventiveMaintenancePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MaintenanceOccurrence"
  ADD CONSTRAINT "MaintenanceOccurrence_maintenance_order_id_fkey"
  FOREIGN KEY ("maintenance_order_id") REFERENCES "MaintenanceOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MaintenanceOccurrence"
  ADD CONSTRAINT "MaintenanceOccurrence_maintenance_order_task_id_fkey"
  FOREIGN KEY ("maintenance_order_task_id") REFERENCES "MaintenanceOrderTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MaintenanceOccurrence"
  ADD CONSTRAINT "MaintenanceOccurrence_maintenance_log_id_fkey"
  FOREIGN KEY ("maintenance_log_id") REFERENCES "Intervention"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ——— PreventivePlanRevision ———
CREATE TABLE "PreventivePlanRevision" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "change_summary" TEXT,
    "changed_by_user_id" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreventivePlanRevision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PreventivePlanRevision_plan_id_version_key" ON "PreventivePlanRevision"("plan_id", "version");
CREATE INDEX "PreventivePlanRevision_plan_id_changed_at_idx" ON "PreventivePlanRevision"("plan_id", "changed_at");
CREATE INDEX "PreventivePlanRevision_changed_by_user_id_idx" ON "PreventivePlanRevision"("changed_by_user_id");

ALTER TABLE "PreventivePlanRevision"
  ADD CONSTRAINT "PreventivePlanRevision_plan_id_fkey"
  FOREIGN KEY ("plan_id") REFERENCES "PreventiveMaintenancePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PreventivePlanRevision"
  ADD CONSTRAINT "PreventivePlanRevision_changed_by_user_id_fkey"
  FOREIGN KEY ("changed_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ——— Seed référentiel types (idempotent) ———
INSERT INTO "MaintenanceType" ("id", "code", "label", "description", "default_instructions", "default_duration_min", "status", "createdAt", "updatedAt")
VALUES
  ('mtype_ctrl_visuel', 'CTRL_VISUEL', 'Contrôle visuel', 'Inspection visuelle de l''équipement', 'Contrôler l''état général, bruits anormaux, fuites visibles.', 15, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mtype_lubrification', 'LUBRIFICATION', 'Lubrification', 'Graissage / lubrification', 'Appliquer le graissage selon points constructeur.', 20, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mtype_nettoyage', 'NETTOYAGE', 'Nettoyage', 'Nettoyage machine', 'Nettoyer les zones accessibles et évacuer les résidus.', 30, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mtype_huile', 'HUILE', 'Contrôle / changement d''huile', 'Niveau et qualité huile', 'Vérifier niveau et aspect ; compléter ou changer si requis.', 25, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mtype_insp_meca', 'INSP_MECA', 'Inspection mécanique', 'Contrôle mécanique approfondi', 'Contrôler fixations, courroies, roulements, jeux.', 60, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mtype_revision', 'REVISION_GEN', 'Révision générale', 'Révision annuelle / périodique majeure', 'Suivre la gamme de révision complète.', 240, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
