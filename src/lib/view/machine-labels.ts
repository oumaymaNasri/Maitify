import { MaintenanceWorkflowStatus } from "@prisma/client";

import type { MachineAssetStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

export function maintenanceWorkflowStatusFr(status: MaintenanceWorkflowStatus): string {
  switch (status) {
    case MaintenanceWorkflowStatus.OPEN:
      return "À faire";
    case MaintenanceWorkflowStatus.COMPLETED:
      return "Clôturée";
    default:
      return status;
  }
}

export function machineAssetStatusFr(status: MachineAssetStatus): string {
  switch (status) {
    case "OPERATIONAL":
      return "Opérationnel";
    case "DOWN":
      return "En panne";
    case "UNDER_MAINTENANCE":
      return "En maintenance";
    default:
      return status;
  }
}

export function machineAssetStatusTone(status: MachineAssetStatus): "success" | "destructive" | "warning" {
  switch (status) {
    case "OPERATIONAL":
      return "success";
    case "DOWN":
      return "destructive";
    case "UNDER_MAINTENANCE":
      return "warning";
    default:
      return "success";
  }
}

export { machineStatusBadgeClass } from "@/lib/view/status-badges";

export function formatLastIntervention(iso: string | null): string {
  if (!iso) return "Aucune intervention";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(iso));
}
