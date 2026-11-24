import type {
  MaintenanceOccurrenceStatus,
  PreventiveFrequency,
  PreventivePlanStatus,
  PreventiveScheduleMode,
  SundayReschedulePolicy,
} from "@prisma/client";

export function preventiveFrequencyFr(f: PreventiveFrequency): string {
  const map: Record<PreventiveFrequency, string> = {
    DAILY: "Journalier",
    WEEKLY: "Hebdomadaire",
    MONTHLY: "Mensuel",
    YEARLY: "Annuel",
  };
  return map[f] ?? f;
}

export function preventiveScheduleModeFr(m: PreventiveScheduleMode): string {
  return m === "FIXED" ? "Fixe" : "Automatique (répartition uniforme)";
}

export function sundayPolicyFr(p: SundayReschedulePolicy): string {
  const map: Record<SundayReschedulePolicy, string> = {
    PREV_SATURDAY: "Report au samedi précédent",
    NEXT_MONDAY: "Report au lundi suivant",
    SKIP: "Ignorer l'occurrence",
  };
  return map[p] ?? p;
}

export function preventivePlanStatusFr(s: PreventivePlanStatus): string {
  const map: Record<PreventivePlanStatus, string> = {
    ACTIVE: "Actif",
    SUSPENDED: "Inactif",
    ARCHIVED: "Archivé",
  };
  return map[s] ?? s;
}

export function occurrenceStatusFr(s: MaintenanceOccurrenceStatus): string {
  const map: Record<MaintenanceOccurrenceStatus, string> = {
    PLANNED: "Planifiée",
    GENERATED: "Générée (OM)",
    DONE: "Réalisée",
    OVERDUE: "En retard",
    SKIPPED: "Ignorée",
    CANCELLED: "Annulée",
    RESCHEDULED: "Reportée",
  };
  return map[s] ?? s;
}
