import { WaterZone } from "@prisma/client";
import { z } from "zod";

function looseNum(s?: string): number | null {
  const t = (s ?? "").trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Formulaire analyse eau — sortie utilisée après validation (hook form + resolver) */
export const waterMeasurementFormSchema = z
  .object({
    zone: z.nativeEnum(WaterZone),
    measuredAt: z.string().min(1, "Date / heure requises"),
    ph: z.string().optional(),
    th: z.string().optional(),
    conductivity: z.string().optional(),
    ta: z.string().optional(),
    tac: z.string().optional(),
    cl: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((raw, ctx) => {
    const d = new Date(raw.measuredAt);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Date / heure invalides.", path: ["measuredAt"] });
    }
    const ph = looseNum(raw.ph);
    if (ph != null && (ph < 0 || ph > 14)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Le pH doit être entre 0 et 14.", path: ["ph"] });
    }
    const th = looseNum(raw.th);
    const conductivity = looseNum(raw.conductivity);
    const ta = looseNum(raw.ta);
    const tac = looseNum(raw.tac);
    const cl = looseNum(raw.cl);
    const vals = [ph, th, conductivity, ta, tac, cl].filter((x) => x != null && Number.isFinite(x));
    if (vals.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Au moins un paramètre (pH, TH, conductivité, TA, TAC ou Cl) est obligatoire.",
      });
    }
  })
  .transform((raw) => {
    return {
      zone: raw.zone,
      measuredAt: new Date(raw.measuredAt),
      ph: looseNum(raw.ph),
      th: looseNum(raw.th),
      conductivity: looseNum(raw.conductivity),
      ta: looseNum(raw.ta),
      tac: looseNum(raw.tac),
      cl: looseNum(raw.cl),
      notes: raw.notes?.trim() ? raw.notes.trim().slice(0, 5000) : null,
    };
  });

export type WaterMeasurementFormValues = z.input<typeof waterMeasurementFormSchema>;
export type WaterMeasurementFormOutput = z.output<typeof waterMeasurementFormSchema>;
