/** Référentiel types pour l'UI lorsque la table MaintenanceType n'existe pas encore.
 * Ce n'est PAS une liste de plans — uniquement des options de formulaire clairement marquées.
 */
export const DESIGN_MAINTENANCE_TYPES = [
  { id: "design:CTRL_VISUEL", code: "CTRL_VISUEL", label: "Contrôle visuel", defaultDurationMin: 15 },
  { id: "design:LUBRIFICATION", code: "LUBRIFICATION", label: "Lubrification", defaultDurationMin: 20 },
  { id: "design:NETTOYAGE", code: "NETTOYAGE", label: "Nettoyage", defaultDurationMin: 30 },
  { id: "design:HUILE", code: "HUILE", label: "Contrôle / changement d'huile", defaultDurationMin: 25 },
  { id: "design:INSP_MECA", code: "INSP_MECA", label: "Inspection mécanique", defaultDurationMin: 60 },
  { id: "design:REVISION_GEN", code: "REVISION_GEN", label: "Révision générale", defaultDurationMin: 240 },
] as const;

export type MaintenanceTypeOption = {
  id: string;
  code: string;
  label: string;
  defaultDurationMin: number | null;
  fromDatabase: boolean;
};

export function designMaintenanceTypeOptions(): MaintenanceTypeOption[] {
  return DESIGN_MAINTENANCE_TYPES.map((t) => ({
    id: t.id,
    code: t.code,
    label: t.label,
    defaultDurationMin: t.defaultDurationMin,
    fromDatabase: false,
  }));
}
