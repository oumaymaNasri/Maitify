"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache/tags";
import { requireManageAction } from "@/lib/auth/session-server";
import { fetchTechnicianDetail } from "@/lib/gmao/technician-detail-query";
import { prisma } from "@/lib/db/prisma";
import type { TechnicianInput } from "@/lib/validations/technician";
import { technicianSchema, technicianUpdateSchema } from "@/lib/validations/technician";

export type TechnicianActionResult = { ok: true; id: string } | { ok: false; error: string };

function revalidateTechnicianPaths() {
  revalidateTag(CACHE_TAGS.technicians);
  revalidatePath("/technicians");
  revalidatePath("/donnees-de-base/technicians");
}

function parseTechnicianForm(formData: FormData) {
  return {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    specialty: formData.get("specialty"),
    role: formData.get("role") ?? "TECHNICIEN",
    availability: formData.get("availability") ?? "DISPONIBLE",
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    employeeCode: formData.get("employeeCode") || undefined,
  };
}

function toTechnicianData(data: TechnicianInput) {
  return {
    firstName: data.firstName,
    lastName: data.lastName,
    specialty: data.specialty,
    role: data.role,
    availability: data.availability,
    email: data.email?.trim() ? data.email.trim() : null,
    phone: data.phone?.trim() ? data.phone.trim() : null,
    employeeCode: data.employeeCode?.trim() ? data.employeeCode.trim() : null,
  };
}

export async function createTechnicianAction(formData: FormData): Promise<TechnicianActionResult> {
  const auth = requireManageAction();
  if (!auth.ok) return { ok: false, error: auth.error };
  const parsed = technicianSchema.safeParse(parseTechnicianForm(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().formErrors[0] ?? "Données invalides." };
  }

  try {
    const t = await prisma.technician.create({ data: toTechnicianData(parsed.data) });
    revalidateTechnicianPaths();
    return { ok: true, id: t.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Échec création." };
  }
}

export async function updateTechnicianAction(formData: FormData): Promise<TechnicianActionResult> {
  const auth = requireManageAction();
  if (!auth.ok) return { ok: false, error: auth.error };
  const parsed = technicianUpdateSchema.safeParse({
    id: formData.get("id")?.toString().trim() ?? "",
    ...parseTechnicianForm(formData),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().formErrors[0] ?? "Données invalides." };
  }

  try {
    await prisma.technician.update({
      where: { id: parsed.data.id },
      data: toTechnicianData(parsed.data),
    });
    revalidateTechnicianPaths();
    return { ok: true, id: parsed.data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Échec mise à jour." };
  }
}

export async function deleteTechnicianAction(id: string): Promise<TechnicianActionResult> {
  const auth = requireManageAction();
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!id?.trim()) return { ok: false, error: "Technicien introuvable." };
  try {
    await prisma.technician.delete({ where: { id } });
    revalidateTechnicianPaths();
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Suppression impossible." };
  }
}

export async function deleteTechniciansBulkAction(ids: string[]): Promise<
  | { ok: true; deleted: number; ids: string[] }
  | { ok: false; error: string; failedIds?: string[] }
> {
  const auth = requireManageAction();
  if (!auth.ok) return { ok: false, error: auth.error };
  const unique = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
  if (unique.length === 0) return { ok: false, error: "Aucun technicien sélectionné." };

  const deleted: string[] = [];
  const failedIds: string[] = [];

  for (const id of unique) {
    try {
      await prisma.technician.delete({ where: { id } });
      deleted.push(id);
    } catch {
      failedIds.push(id);
    }
  }

  if (deleted.length === 0) {
    return { ok: false, error: "Suppression impossible.", failedIds };
  }

  revalidateTechnicianPaths();
  return { ok: true, deleted: deleted.length, ids: deleted };
}

export async function updateTechnicianAvailabilityAction(
  id: string,
  availability: "DISPONIBLE" | "EN_INTERVENTION",
): Promise<TechnicianActionResult> {
  try {
    await prisma.technician.update({ where: { id }, data: { availability } });
    revalidateTechnicianPaths();
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Échec mise à jour." };
  }
}

export async function getTechnicianDetailAction(id: string) {
  if (!id?.trim()) return { ok: false as const, error: "ID invalide." };
  try {
    const detail = await fetchTechnicianDetail(id);
    if (!detail) return { ok: false as const, error: "Technicien introuvable." };
    return { ok: true as const, data: detail };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Erreur chargement." };
  }
}
