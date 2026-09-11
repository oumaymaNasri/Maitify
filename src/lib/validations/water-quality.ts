import { WaterZone } from "@prisma/client";
import { z } from "zod";

const numOrNull = z.number().finite().nullable();

/** Objet déjà normalisé (nombres ou null) — utilisé après parsing FormData */
export const waterMeasurementParsedSchema = z
  .object({
    zone: z.nativeEnum(WaterZone),
    measuredAt: z.date(),
    ph: numOrNull,
    th: numOrNull,
    conductivity: numOrNull,
    ta: numOrNull,
    tac: numOrNull,
    cl: numOrNull,
    notes: z.string().max(5000).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const vals = [data.ph, data.th, data.conductivity, data.ta, data.tac, data.cl].filter(
      (x) => x != null && Number.isFinite(x),
    );
    if (vals.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Renseignez au moins un paramètre chimique (pH, TH, conductivité, TA, TAC ou Cl).",
      });
    }
  });

export type WaterMeasurementParsed = z.infer<typeof waterMeasurementParsedSchema>;
