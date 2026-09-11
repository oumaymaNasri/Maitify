import { MachineAssetStatus, MaintenanceFrequency } from "@prisma/client";
import { z } from "zod";

const imageUrlField = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine(
    (v) =>
      !v ||
      v.startsWith("data:image/") ||
      v.startsWith("http://") ||
      v.startsWith("https://") ||
      (v.startsWith("/") && !v.startsWith("//")),
    "URL ou chemin d'image invalide.",
  );

const imageDataUrlField = z
  .string()
  .optional()
  .refine((v) => !v || v.startsWith("data:image/"), "Image invalide.");

export const machineFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères."),
  legacyMatricule: z.union([z.string(), z.number()]).optional(),
  location: z.string().trim().min(1, "L'emplacement est requis."),
  maintenanceSector: z.nativeEnum(MaintenanceFrequency),
  assetStatus: z.nativeEnum(MachineAssetStatus),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  imageUrl: imageUrlField,
  imageDataUrl: imageDataUrlField,
});

export const machineEditFormSchema = machineFormSchema.extend({
  targetAvailabilityPct: z.number().min(0, "Minimum 0 %.").max(100, "Maximum 100 %.").optional(),
});

export type MachineFormInput = z.infer<typeof machineFormSchema>;
export type MachineEditFormInput = z.infer<typeof machineEditFormSchema>;

export const createMachineSchema = machineFormSchema.omit({ id: true });
export type CreateMachineInput = z.infer<typeof createMachineSchema>;

export const updateMachineSchema = machineFormSchema.extend({
  id: z.string().min(1, "Identifiant requis."),
});
export type UpdateMachineInput = z.infer<typeof updateMachineSchema>;
