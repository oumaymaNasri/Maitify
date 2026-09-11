import type {
  FailureCause,
  InterventionType,
  MaintenanceWorkflowStatus,
  OperationType,
} from "@prisma/client";

export type InterventionListVm = {
  id: string;
  date: string;
  operationType: OperationType;
  workflowStatus: MaintenanceWorkflowStatus;
  failureDescription: string | null;
  workPerformed: string;
  machineId: string;
  machineName: string;
  machineLocation: string;
  technicianId: string | null;
  technicianName: string | null;
  durationMinutes: number | null;
  importSource: string | null;
  operation: string | null;
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
