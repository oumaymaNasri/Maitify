import type {
  DurationUnit,
  FailureCause,
  MaintenanceFrequency,
  OperationType,
  TechnicianAvailability,
  TechnicianRole,
  TechnicianSpecialty,
} from "@prisma/client";

export function technicianSpecialtyFr(s: TechnicianSpecialty): string {
  const map: Record<TechnicianSpecialty, string> = {
    ELECTRIQUE: "Électrique",
    MECANIQUE: "Mécanique",
    FLUIDES: "Fluides",
  };
  return map[s] ?? s;
}

export function technicianRoleFr(r: TechnicianRole): string {
  return r === "RESPONSABLE" ? "Directeur" : "Technicien";
}

export function technicianAvailabilityFr(a: TechnicianAvailability): string {
  return a === "EN_INTERVENTION" ? "En intervention" : "Disponible";
}

export function maintenanceFrequencyFr(f: MaintenanceFrequency): string {
  const map: Record<MaintenanceFrequency, string> = {
    JOURNALIERE: "Journalier",
    HEBDOMADAIRE: "Hebdomadaire",
    MENSUELLE: "Mensuelle",
    PAR_POSTE: "Par poste",
  };
  return map[f] ?? f;
}

export function operationTypeFr(t: OperationType): string {
  const map: Record<OperationType, string> = {
    REMPLACEMENT: "Remplacement",
    DIAGNOSTIC: "Diagnostic",
    AMELIORATION: "Amélioration",
    CONTROLE: "Contrôle",
    CHANGEMENT: "Changement",
  };
  return map[t] ?? t;
}

export function failureCauseFr(c: FailureCause): string {
  const map: Record<FailureCause, string> = {
    USURE_NORMALE: "Usure normale",
    DEFAUT_UTILISATEUR: "Défaut utilisateur",
    DEFAUT_PRODUIT: "Défaut produit",
    AUTRE: "Autre",
    ENTRETIEN_MACHINE: "Entretien machine",
  };
  return map[c] ?? c;
}

export function durationUnitFr(u: DurationUnit): string {
  const map: Record<DurationUnit, string> = {
    PER_MINUTE: "Par minute",
    MAINTENANCE_DAY: "Jour de maintenance",
    MASKED_TIME: "Temps masqué",
  };
  return map[u] ?? u;
}

export function maintenanceOrderStatusFr(
  s: "ACTIVE" | "COMPLETED" | "CANCELLED",
): string {
  const map = {
    ACTIVE: "Actif",
    COMPLETED: "Clôturé",
    CANCELLED: "Annulé",
  } as const;
  return map[s] ?? s;
}
