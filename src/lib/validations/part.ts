import { z } from "zod";

const imageUrlField = z
  .string()
  .optional()
  .transform((v) => (v?.trim() ? v.trim() : undefined));

const imageDataUrlField = z
  .string()
  .optional()
  .transform((v) => (v?.trim() ? v.trim() : undefined));

export const partFormSchema = z.object({
  id: z.string().optional(),
  designation: z.string().min(1, "La désignation est requise.").max(200),
  brand: z.string().max(120).optional().transform((v) => v?.trim() || undefined),
  reference: z.string().max(120).optional().transform((v) => v?.trim() || undefined),
  minStock: z.coerce.number().int().min(0, "Le seuil doit être ≥ 0."),
  initialQuantity: z.coerce.number().int().min(0, "La quantité doit être ≥ 0.").optional(),
  quantity: z.coerce.number().int().min(0, "La quantité doit être ≥ 0.").optional(),
  machineIds: z.array(z.string().min(1)).default([]),
  imageUrl: imageUrlField,
  imageDataUrl: imageDataUrlField,
});

export type PartFormInput = z.infer<typeof partFormSchema>;

export const partUpdateSchema = partFormSchema.extend({
  id: z.string().min(1, "Pièce introuvable."),
});

export const stockAdjustSchema = z.object({
  partId: z.string().min(1),
  type: z.enum(["ENTREE", "SORTIE"]),
  quantity: z.coerce.number().int().min(1, "La quantité doit être ≥ 1."),
  motif: z.string().max(500).optional().transform((v) => v?.trim() || undefined),
  date: z.coerce.date().optional(),
});

export type StockAdjustInput = z.infer<typeof stockAdjustSchema>;
