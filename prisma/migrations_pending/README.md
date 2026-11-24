# Migrations en attente (non appliquées)

Les SQL de ce dossier sont **préparés manuellement** et **ne sont pas** gérés par `prisma migrate deploy` tant qu’ils n’ont pas été déplacés / baselinés après autorisation.

## Lot 1 — Planning préventif

- Dossier : `20261115_lot1_preventive_planning/`
- `migration.sql` — création additive (enums + tables + seed types)
- `ROLLBACK.sql` — suppression des seuls objets Lot 1

**Ne pas exécuter** sans sauvegarde vérifiée et accord explicite.

## Rattrapage additif du schéma (23/11/2026)

- Dossier : `20261123_schema_drift_additive/`
- `migration.sql` — colonnes / enums / index manquants (dont `MaintenanceOrderLine.task_controle`), **sans** suppression de `MaintenanceOrder.intervention_type`.
- Appliqué sur la base **locale** `nutrifish_gmao` le 23/11/2026 après sauvegarde `backups/nutrifish_gmao_20261123_205448.dump` (restauration vérifiée).
- À appliquer sur toute autre base (production comprise) après vérification de son propre écart (`prisma migrate diff`) et sauvegarde.
