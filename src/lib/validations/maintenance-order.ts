import { InterventionType, MaintenanceOrderStatus } from "@prisma/client";
import { z } from "zod";

const orderLineSchema = z.object({
  machineId: z.string().min(1, "Machine requise"),
  taskNettoyage: z.boolean().default(false),
  taskGraissage: z.boolean().default(false),
  taskHuile: z.boolean().default(false),
  taskControl: z.boolean().default(false),
  taskNonConforme: z.boolean().default(false),
});

export const maintenanceOrderSchema = z.object({
  plannedDate: z.coerce.date(),
  interventionType: z.nativeEnum(InterventionType).default(InterventionType.PREVENTIVE),
  observationComment: z.string().nullable().optional(),
  managerApproval: z.string().nullable().optional(),
  machineIds: z.array(z.string().min(1)).min(1, "Sélectionnez au moins une machine"),
  taskNettoyage: z.boolean().default(false),
  taskGraissage: z.boolean().default(false),
  taskHuile: z.boolean().default(false),
  taskControl: z.boolean().default(false),
  taskNonConforme: z.boolean().default(false),
});

export const maintenanceOrderUpdateSchema = maintenanceOrderSchema.extend({
  id: z.string().min(1, "Ordre introuvable"),
  status: z.nativeEnum(MaintenanceOrderStatus).optional(),
});

export type MaintenanceOrderInput = z.infer<typeof maintenanceOrderSchema>;
export type MaintenanceOrderUpdateInput = z.infer<typeof maintenanceOrderUpdateSchema>;

export function buildOrderLinesFromInput(data: MaintenanceOrderInput): z.infer<typeof orderLineSchema>[] {
  return data.machineIds.map((machineId) => ({
    machineId,
    taskNettoyage: data.taskNettoyage,
    taskGraissage: data.taskGraissage,
    taskHuile: data.taskHuile,
    taskControl: data.taskControl,
    taskNonConforme: data.taskNonConforme,
  }));
}

export function interventionTypeToOperationType(type: InterventionType): "CONTROLE" | "DIAGNOSTIC" | "AMELIORATION" {
  switch (type) {
    case InterventionType.PREVENTIVE:
      return "CONTROLE";
    case InterventionType.AMELIORATION:
      return "AMELIORATION";
    default:
      return "DIAGNOSTIC";
  }
}
