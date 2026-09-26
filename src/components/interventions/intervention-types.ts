import type {
  FailureCause,
  InterventionType,
  MaintenanceWorkflowStatus,
  OperationType,
} from "@prisma/client";

export type InterventionListVm = {
  id: string;
  importMatricule: string | null;
  date: string;
  sectorMaintenance: string | null;
  service: string | null;
  technicianId: string | null;
  technicianName: string | null;
  machineId: string;
  machineName: string;
  machineLocation: string;
  failureDescription: string | null;
  operation: string | null;
  operationType: OperationType;
  type: InterventionType;
  workflowStatus: MaintenanceWorkflowStatus;
  failureCause: FailureCause | null;
  failureCauseLabel: string | null;
  linkedFailureCause: string | null;
  durationMinutes: number | null;
  workPerformed: string;
  difficulties: string | null;
  sparePartsLabel: string | null;
  importSource: string | null;
  /** true = réalisée, false = non réalisée, null = pas encore validée (préventives uniquement) */
  preventiveRealized: boolean | null;
};

export type InterventionSpareLineVm = {
  designation: string;
  brand: string | null;
  reference: string | null;
  quantityUsed: number;
};

export type InterventionDetailVm = {
  id: string;
  date: string;
  operationType: OperationType;
  type: InterventionType;
  workflowStatus: MaintenanceWorkflowStatus;
  failureDescription: string | null;
  workPerformed: string;
  difficulties: string | null;
  durationMinutes: number | null;
  failureCause: FailureCause | null;
  signature: string | null;
  sectorMaintenance: string | null;
  service: string | null;
  operation: string | null;
  machine: { id: string; name: string; location: string };
  technician: { id: string; firstName: string; lastName: string } | null;
  sparePartLines: InterventionSpareLineVm[];
};
