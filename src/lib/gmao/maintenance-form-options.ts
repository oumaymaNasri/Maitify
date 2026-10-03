import {
  DurationUnit,
  FailureCause,
  InterventionType,
  MaintenanceFrequency,
  OperationType,
} from "@prisma/client";

export const INTERVENTION_TYPE_OPTIONS: { value: InterventionType; label: string }[] = [
  { value: InterventionType.PREVENTIVE, label: "Préventive" },
  { value: InterventionType.CORRECTIVE, label: "Corrective" },
  { value: InterventionType.PREDICTIVE, label: "Prédictive" },
  { value: InterventionType.AMELIORATION, label: "Améliorative" },
  { value: InterventionType.AUTONOME, label: "Autonome" },
];

export const OPERATION_TYPE_OPTIONS: { value: OperationType; label: string }[] = [
  { value: OperationType.CONTROLE, label: "Contrôle" },
  { value: OperationType.CHANGEMENT, label: "Changement" },
  { value: OperationType.DIAGNOSTIC, label: "Diagnostic" },
  { value: OperationType.REMPLACEMENT, label: "Remplacement" },
  { value: OperationType.AMELIORATION, label: "Amélioration" },
];

export const FAILURE_CAUSE_OPTIONS: { value: FailureCause; label: string }[] = [
  { value: FailureCause.USURE_NORMALE, label: "Usure normale" },
  { value: FailureCause.DEFAUT_UTILISATEUR, label: "Défaut utilisateur" },
  { value: FailureCause.DEFAUT_PRODUIT, label: "Défaut produit" },
  { value: FailureCause.ENTRETIEN_MACHINE, label: "Entretien machine" },
  { value: FailureCause.AUTRE, label: "Autre" },
];

export const DURATION_UNIT_OPTIONS: { value: DurationUnit; label: string }[] = [
  { value: DurationUnit.PER_MINUTE, label: "Par minute" },
  { value: DurationUnit.MAINTENANCE_DAY, label: "Jour de maintenance" },
  { value: DurationUnit.MASKED_TIME, label: "Temps masqué" },
];

/** Secteur saisi sur l’intervention (texte libre en base, liste fermée à la saisie). */
export const SECTOR_MAINTENANCE_OPTIONS = [
  { value: "Journalier", label: "Journalier" },
  { value: "Par poste", label: "Par poste" },
  { value: "Hebdomadaire", label: "Hebdomadaire" },
  { value: "Mensuelle", label: "Mensuelle" },
] as const;

export const MACHINE_FREQUENCY_OPTIONS = Object.values(MaintenanceFrequency);
