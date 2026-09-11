"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache/tags";
import { requireManageAction } from "@/lib/auth/session-server";
import { fetchMachineDetail } from "@/lib/gmao/machine-detail-query";
import { resolveMachineImageUrl } from "@/lib/gmao/machine-image";
import { prisma } from "@/lib/db/prisma";
import { createMachineSchema, updateMachineSchema } from "@/lib/validations/machine";

export type MachineActionResult = { ok: true; id: string } | { ok: false; error: string };

function buildQrPayload(machineId: string): string {
  return `NUTRIFISH|MACHINE|${machineId}`;
}

function parseLegacyMatricule(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.trunc(n);
}

function resolveStoredImageUrl(data: { imageUrl?: string; imageDataUrl?: string }): string | undefined {
  const url = data.imageUrl?.trim();
  if (url) return url;
  return data.imageDataUrl?.trim() || undefined;
}

function parseFormPayload(formData: FormData) {
  const legacyRaw = formData.get("legacyMatricule")?.toString().trim();
  const targetRaw = formData.get("targetAvailabilityPct")?.toString().trim();
  const imageUrlRaw = formData.get("imageUrl")?.toString().trim();

  return {
    id: formData.get("id")?.toString(),
    name: formData.get("name")?.toString() ?? "",
    legacyMatricule: legacyRaw === "" ? undefined : legacyRaw,
    location: formData.get("location")?.toString() ?? "",
    maintenanceSector: formData.get("maintenanceSector")?.toString() ?? "HEBDOMADAIRE",
    assetStatus: formData.get("assetStatus")?.toString() ?? "OPERATIONAL",
    targetAvailabilityPct: targetRaw === "" ? undefined : targetRaw,
    description: formData.get("description")?.toString() ?? "",
    imageUrl: imageUrlRaw === "" ? undefined : imageUrlRaw,
    imageDataUrl: formData.get("imageDataUrl")?.toString() || undefined,
  };
}

function toUpdateData(data: {
  name: string;
  legacyMatricule?: string | number;
  location: string;
  maintenanceSector: string;
  assetStatus: string;
  targetAvailabilityPct?: number;
  description?: string;
}) {
  const legacyStr =
    data.legacyMatricule === undefined || data.legacyMatricule === null
      ? undefined
      : String(data.legacyMatricule);

  return {
    name: data.name,
    legacyMatricule: parseLegacyMatricule(legacyStr),
    location: data.location,
    maintenanceSector: data.maintenanceSector,
    assetStatus: data.assetStatus,
    targetAvailabilityPct: data.targetAvailabilityPct,
    description: data.description,
  };
}

function revalidateMachinePaths() {
  revalidateTag(CACHE_TAGS.machines);
  revalidatePath("/machines");
}

export async function createMachineAction(formData: FormData): Promise<MachineActionResult> {
  const auth = requireManageAction();
  if (!auth.ok) return { ok: false, error: auth.error };
  const parsed = createMachineSchema.safeParse(parseFormPayload(formData));
  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors[0] ?? "Données invalides.";
    return { ok: false, error: msg };
  }

  const data = parsed.data;
  const storedImage = resolveStoredImageUrl(data);

  try {
    const machine = await prisma.machine.create({
      data: {
        name: data.name,
        location: data.location,
        maintenanceSector: data.maintenanceSector,
        assetStatus: data.assetStatus,
        description: data.description?.trim() || null,
        qrCode: null,
        galleryImageUrls: storedImage ? [storedImage] : [],
        photos: storedImage
          ? { create: [{ url: storedImage, sortOrder: 0, caption: "Photo principale" }] }
          : undefined,
      },
    });

    await prisma.machine.update({
      where: { id: machine.id },
      data: { qrCode: buildQrPayload(machine.id) },
    });

    revalidateMachinePaths();
    return { ok: true, id: machine.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Échec de la création." };
  }
}

export async function updateMachineAction(formData: FormData): Promise<MachineActionResult> {
  const auth = requireManageAction();
  if (!auth.ok) return { ok: false, error: auth.error };
  const parsed = updateMachineSchema.safeParse(parseFormPayload(formData));
  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors[0] ?? "Données invalides.";
    return { ok: false, error: msg };
  }

  const data = parsed.data;
  const fields = toUpdateData(data);

  try {
    const existing = await prisma.machine.findUnique({
      where: { id: data.id },
      select: { galleryImageUrls: true },
    });
    if (!existing) return { ok: false, error: "Machine introuvable." };

    const gallery = [...existing.galleryImageUrls];
    const storedImage = resolveStoredImageUrl(data);
    if (storedImage) {
      if (gallery.length === 0) gallery.push(storedImage);
      else gallery[0] = storedImage;
    }

    await prisma.machine.update({
      where: { id: data.id },
      data: {
        name: fields.name,
        legacyMatricule: fields.legacyMatricule,
        location: fields.location,
        maintenanceSector: fields.maintenanceSector as typeof data.maintenanceSector,
        assetStatus: fields.assetStatus as typeof data.assetStatus,
        ...(fields.targetAvailabilityPct != null
          ? { targetAvailability: fields.targetAvailabilityPct / 100 }
          : {}),
        description: fields.description?.trim() || null,
        galleryImageUrls: gallery,
        ...(storedImage
          ? {
              photos: {
                deleteMany: { sortOrder: 0 },
                create: [{ url: storedImage, sortOrder: 0, caption: "Photo principale" }],
              },
            }
          : {}),
      },
    });

    revalidateMachinePaths();
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Échec de la mise à jour." };
  }
}

export async function deleteMachineAction(id: string): Promise<MachineActionResult> {
  const auth = requireManageAction();
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!id?.trim()) return { ok: false, error: "Machine introuvable." };

  try {
    await prisma.machine.delete({ where: { id } });
    revalidateMachinePaths();
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Suppression impossible (liens actifs)." };
  }
}

export async function deleteMachinesBulkAction(ids: string[]): Promise<
  | { ok: true; deleted: number; ids: string[] }
  | { ok: false; error: string; failedIds?: string[] }
> {
  const auth = requireManageAction();
  if (!auth.ok) return { ok: false, error: auth.error };
  const unique = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
  if (unique.length === 0) return { ok: false, error: "Aucune machine sélectionnée." };

  const deleted: string[] = [];
  const failedIds: string[] = [];

  for (const id of unique) {
    try {
      await prisma.machine.delete({ where: { id } });
      deleted.push(id);
    } catch {
      failedIds.push(id);
    }
  }

  if (deleted.length === 0) {
    return {
      ok: false,
      error: "Suppression impossible (liens actifs ou machines introuvables).",
      failedIds,
    };
  }

  revalidateMachinePaths();
  return { ok: true, deleted: deleted.length, ids: deleted };
}

export async function getMachineDetailAction(id: string) {
  if (!id?.trim()) return { ok: false as const, error: "ID invalide." };
  try {
    const detail = await fetchMachineDetail(id);
    if (!detail) return { ok: false as const, error: "Machine introuvable." };
    return {
      ok: true as const,
      data: {
        ...detail,
        imageUrl: resolveMachineImageUrl(detail.photos, detail.galleryImageUrls),
        maintenanceLogs: detail.maintenanceLogs.map((l) => ({
          ...l,
          date: l.date.toISOString(),
        })),
      },
    };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Erreur chargement." };
  }
}

export async function ensureMachineQrCodeAction(machineId: string): Promise<MachineActionResult & { qrCode?: string }> {
  const auth = requireManageAction();
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!machineId?.trim()) return { ok: false, error: "Machine introuvable." };

  try {
    const machine = await prisma.machine.findUnique({
      where: { id: machineId },
      select: { id: true, qrCode: true },
    });
    if (!machine) return { ok: false, error: "Machine introuvable." };

    const qrCode = machine.qrCode?.trim() || buildQrPayload(machine.id);
    if (!machine.qrCode) {
      await prisma.machine.update({ where: { id: machine.id }, data: { qrCode } });
      revalidateTag(CACHE_TAGS.machines);
    }
    return { ok: true, id: machine.id, qrCode };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Échec génération QR." };
  }
}
