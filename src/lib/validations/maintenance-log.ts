import {

  FailureCause,

  InterventionType,

  MaintenanceWorkflowStatus,

  OperationType,

} from "@prisma/client";

import { z } from "zod";



const usageLineSchema = z.object({

  sparePartId: z.string().min(1),

  quantity: z.number().int().positive(),

});



/** Schéma brut — aucun .refine() / .superRefine() (requis pour .omit() / .extend()). */

export const baseMaintenanceLogSchema = z.object({

  machineId: z.string().min(1, "Machine requise"),

  technicianId: z.string().min(1, "Technicien requis"),

  operationType: z.nativeEnum(OperationType),

  type: z.nativeEnum(InterventionType).optional(),

  date: z.coerce.date(),

  workPerformed: z.string().min(1, "Rapport d'intervention requis"),

  failureDescription: z.string().nullable().optional(),

  durationMinutes: z.number().int().min(0).nullable().optional(),

  sectorMaintenance: z.string().nullable().optional(),

  service: z.string().nullable().optional(),

  operation: z.string().nullable().optional(),

  difficulties: z.string().nullable().optional(),

  failureCause: z.nativeEnum(FailureCause).nullable().optional(),

  signature: z.string().optional(),

  photoBefore: z.string().optional(),

  photoAfter: z.string().optional(),

  preventiveCleaning: z.boolean().optional(),

  preventiveLubrication: z.boolean().optional(),

  preventiveOil: z.boolean().optional(),

  preventiveControl: z.boolean().optional(),

  preventiveNonConforme: z.boolean().optional(),

  maintenanceOrderLineId: z.string().optional(),

  lines: z.array(usageLineSchema).default([]),

  workflowStatus: z.nativeEnum(MaintenanceWorkflowStatus).default(MaintenanceWorkflowStatus.COMPLETED),

  /** Statut machine après clôture (défaut opérationnel) */

  machineStatusOnComplete: z.enum(["OPERATIONAL", "DOWN", "UNDER_MAINTENANCE"]).optional(),

});



/** Mise à jour — dérivé du schéma de base avant tout raffinement. */

export const maintenanceLogEditSchema = baseMaintenanceLogSchema

  .omit({

    lines: true,

    photoBefore: true,

    photoAfter: true,

    signature: true,

    machineStatusOnComplete: true,

    preventiveCleaning: true,

    preventiveLubrication: true,

    preventiveOil: true,

    preventiveControl: true,

    maintenanceOrderLineId: true,

  })

  .extend({

    id: z.string().min(1, "Intervention introuvable"),

  });



export type MaintenanceLogEditInput = z.infer<typeof maintenanceLogEditSchema>;



function refineSignatureWhenPartsUsed<T extends { lines: { sparePartId: string; quantity: number }[]; signature?: string }>(

  schema: z.ZodType<T>,

) {

  return schema.superRefine((data, ctx) => {

    if (data.lines.length > 0) {

      const sig = data.signature?.trim() ?? "";

      if (!sig.startsWith("data:image") || sig.length < 32) {

        ctx.addIssue({

          code: z.ZodIssueCode.custom,

          message:

            "Signature requise pour consommer des pièces : le stock est déduit uniquement après signature valide.",

          path: ["signature"],

        });

      }

    }

  });

}



/** Création complète — raffinements appliqués en dernier. */

export const maintenanceLogPayloadSchema = refineSignatureWhenPartsUsed(baseMaintenanceLogSchema);



export type MaintenanceLogPayload = z.infer<typeof maintenanceLogPayloadSchema>;



export function mapOperationToLegacyType(op: OperationType): InterventionType {

  switch (op) {

    case OperationType.AMELIORATION:

      return InterventionType.AMELIORATION;

    case OperationType.CONTROLE:

      return InterventionType.PREVENTIVE;

    default:

      return InterventionType.CORRECTIVE;

  }

}


