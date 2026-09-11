import type {
  MaintenanceWorkflowStatus,
  OperationType,
  TechnicianAvailability,
  TechnicianRole,
  TechnicianSpecialty,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export type TechnicianInterventionHistoryItem = {
  id: string;
  date: string;
  operationType: OperationType;
  workflowStatus: MaintenanceWorkflowStatus;
  machineName: string;
};

export type TechnicianDetailVm = {
  id: string;
  firstName: string;
  lastName: string;
  specialty: TechnicianSpecialty;
  role: TechnicianRole;
  availability: TechnicianAvailability;
  email: string | null;
  phone: string | null;
  employeeCode: string | null;
  interventionCount: number;
  recentInterventions: TechnicianInterventionHistoryItem[];
};

const HISTORY_LIMIT = 25;

export async function fetchTechnicianDetail(id: string): Promise<TechnicianDetailVm | null> {
  const row = await prisma.technician.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      specialty: true,
      role: true,
      availability: true,
      email: true,
      phone: true,
      employeeCode: true,
      _count: { select: { maintenanceLogs: true } },
      maintenanceLogs: {
        take: HISTORY_LIMIT,
        orderBy: { date: "desc" },
        select: {
          id: true,
          date: true,
          operationType: true,
          workflowStatus: true,
          machine: { select: { name: true } },
        },
      },
    },
  });

  if (!row) return null;

  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    specialty: row.specialty,
    role: row.role,
    availability: row.availability,
    email: row.email,
    phone: row.phone,
    employeeCode: row.employeeCode,
    interventionCount: row._count.maintenanceLogs,
    recentInterventions: row.maintenanceLogs.map((log) => ({
      id: log.id,
      date: log.date.toISOString(),
      operationType: log.operationType,
      workflowStatus: log.workflowStatus,
      machineName: log.machine.name,
    })),
  };
}
