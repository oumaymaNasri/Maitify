import {
  PreventiveFrequency,
  PreventivePlanStatus,
  PreventiveScheduleMode,
  SundayReschedulePolicy,
} from "@prisma/client";
import { z } from "zod";

import { TIME_LOCAL_REGEX } from "@/lib/preventive/constants";

const timeLocal = z.string().regex(TIME_LOCAL_REGEX, "Horaire invalide (HH:mm).");

export const scheduleRuleSchema = z.object({
  sortOrder: z.number().int().min(0),
  weekday: z.number().int().min(1).max(7).optional().nullable(),
  monthDay: z.number().int().min(1).max(31).optional().nullable(),
  month: z.number().int().min(1).max(12).optional().nullable(),
  timeLocal,
});

export const preventivePlanBaseSchema = z.object({
  machineId: z.string().min(1, "Machine requise."),
  maintenanceTypeId: z.string().min(1, "Type de maintenance requis."),
  title: z.string().trim().min(2, "Titre trop court.").max(200),
  description: z.string().trim().max(4000).optional().nullable(),
  instructions: z.string().trim().max(8000).optional().nullable(),
  frequency: z.nativeEnum(PreventiveFrequency),
  occurrencesPerPeriod: z.number().int().min(1, "Au moins 1 exécution.").max(366),
  scheduleMode: z.nativeEnum(PreventiveScheduleMode),
  includeSunday: z.boolean().default(false),
  sundayPolicy: z.nativeEnum(SundayReschedulePolicy).default(SundayReschedulePolicy.NEXT_MONDAY),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  estimatedDurationMin: z.number().int().min(1).max(24 * 60).optional().nullable(),
  assigneeTechnicianId: z.string().min(1).optional().nullable(),
  status: z.nativeEnum(PreventivePlanStatus).default(PreventivePlanStatus.ACTIVE),
  defaultTimes: z.array(timeLocal).default([]),
  generationHorizonDays: z.number().int().min(1).max(366).default(30),
  scheduleRules: z.array(scheduleRuleSchema).default([]),
});

export const preventivePlanCreateSchema = preventivePlanBaseSchema.superRefine((data, ctx) => {
  if (data.endDate && data.endDate < data.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La date de fin doit être postérieure ou égale à la date de début.",
      path: ["endDate"],
    });
  }

  if (data.scheduleMode === PreventiveScheduleMode.FIXED) {
    if (data.scheduleRules.length !== data.occurrencesPerPeriod) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "En mode fixe, le nombre de créneaux doit égaler le nombre d'exécutions.",
        path: ["scheduleRules"],
      });
    }
  }

  if (data.scheduleMode === PreventiveScheduleMode.AUTOMATIC) {
    if (data.defaultTimes.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "En mode automatique, au moins un horaire par défaut est requis.",
        path: ["defaultTimes"],
      });
    } else if (
      data.defaultTimes.length !== 1 &&
      data.defaultTimes.length !== data.occurrencesPerPeriod
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Fournissez 1 horaire (répété) ou exactement N horaires.",
        path: ["defaultTimes"],
      });
    }
  }

  if (!data.includeSunday && !data.sundayPolicy) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Une politique de report dimanche est requise lorsque le dimanche est exclu.",
      path: ["sundayPolicy"],
    });
  }
});

export const preventivePlanUpdateSchema = preventivePlanCreateSchema.and(
  z.object({ id: z.string().min(1, "Plan introuvable.") }),
);

export const maintenanceTypeFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[A-Z][A-Z0-9_]*$/, "Code : majuscules, chiffres, underscore."),
  label: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  defaultInstructions: z.string().trim().max(8000).optional().nullable(),
  defaultDurationMin: z.number().int().min(1).max(24 * 60).optional().nullable(),
});

export type PreventivePlanFormInput = z.infer<typeof preventivePlanBaseSchema>;
export type MaintenanceTypeFormInput = z.infer<typeof maintenanceTypeFormSchema>;
