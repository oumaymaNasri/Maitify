"use server";

import { WaterZone } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache/tags";
import { requireManageAction } from "@/lib/auth/session-server";

import { prisma } from "@/lib/db/prisma";
import {
  waterMeasurementParsedSchema,
  type WaterMeasurementParsed,
} from "@/lib/validations/water-quality";
import { persistWaterQualityAlertIfOutOfBounds } from "@/lib/water-quality/emit-water-alert";

export type CreateWaterMeasurementResult = { ok: true } | { ok: false; error: string };

export async function createWaterMeasurementAction(data: WaterMeasurementParsed): Promise<CreateWaterMeasurementResult> {
  const auth = requireManageAction();
  if (!auth.ok) return { ok: false, error: auth.error };
  const parsed = waterMeasurementParsedSchema.safeParse(data);
  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.flatten().fieldErrors.zone?.[0];
    return { ok: false, error: (typeof msg === "string" && msg) || "Mesure invalide." };
  }
  try {
    await prisma.waterQualityMeasurement.create({ data: parsed.data });
    await persistWaterQualityAlertIfOutOfBounds(parsed.data);
    revalidateTag(CACHE_TAGS.waterMeasurements);
    revalidateTag(CACHE_TAGS.dashboard);
    revalidatePath("/water-quality");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Échec enregistrement." };
  }
}

function parseOptionalNumber(raw: FormDataEntryValue | null): number | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export async function createWaterMeasurementFromForm(formData: FormData): Promise<CreateWaterMeasurementResult> {
  const zoneRaw = formData.get("zone")?.toString().trim();
  if (!zoneRaw || !Object.values(WaterZone).includes(zoneRaw as WaterZone)) {
    return { ok: false, error: "Zone d'eau invalide." };
  }
  const measuredAtRaw = formData.get("measuredAt")?.toString();
  const measuredAt = measuredAtRaw ? new Date(measuredAtRaw) : new Date();
  const notesRaw = formData.get("notes")?.toString().trim();

  const payload = {
    zone: zoneRaw as WaterZone,
    measuredAt,
    ph: parseOptionalNumber(formData.get("ph")),
    th: parseOptionalNumber(formData.get("th")),
    conductivity: parseOptionalNumber(formData.get("conductivity")),
    ta: parseOptionalNumber(formData.get("ta")),
    tac: parseOptionalNumber(formData.get("tac")),
    cl: parseOptionalNumber(formData.get("cl")),
    notes: notesRaw?.length ? notesRaw : null,
  };

  const parsed = waterMeasurementParsedSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().formErrors[0] ?? "Données invalides." };
  }

  try {
    await prisma.waterQualityMeasurement.create({ data: parsed.data });
    await persistWaterQualityAlertIfOutOfBounds(parsed.data);
    revalidateTag(CACHE_TAGS.waterMeasurements);
    revalidateTag(CACHE_TAGS.dashboard);
    revalidatePath("/water-quality");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Échec enregistrement." };
  }
}
