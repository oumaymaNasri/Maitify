"use server";

import { AlertSeverity, AlertType, type Prisma } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache/tags";
import { requireManageAction } from "@/lib/auth/session-server";
import { prisma } from "@/lib/db/prisma";
import { partFormSchema, partUpdateSchema, stockAdjustSchema } from "@/lib/validations/part";

export type PartActionResult = { ok: true; id: string } | { ok: false; error: string };

function resolveStoredImageUrl(data: { imageUrl?: string; imageDataUrl?: string }): string | undefined {
  const url = data.imageUrl?.trim();
  if (url) return url;
  return data.imageDataUrl?.trim() || undefined;
}

function parseMachineIds(formData: FormData): string[] {
  const raw = formData.get("machineIds")?.toString() ?? "";
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    /* fallback comma-separated */
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parsePartForm(formData: FormData) {
  return {
    id: formData.get("id")?.toString(),
    designation: formData.get("designation")?.toString() ?? "",
    brand: formData.get("brand")?.toString() ?? "",
    reference: formData.get("reference")?.toString() ?? "",
    minStock: formData.get("minStock")?.toString() ?? "0",
    initialQuantity: formData.get("initialQuantity")?.toString() ?? "0",
    quantity: formData.get("quantity")?.toString(),
    machineIds: parseMachineIds(formData),
    imageUrl: formData.get("imageUrl")?.toString() ?? "",
    imageDataUrl: formData.get("imageDataUrl")?.toString() || undefined,
  };
}

function revalidateStockPaths() {
  revalidateTag(CACHE_TAGS.parts);
  revalidateTag(CACHE_TAGS.stock);
  revalidatePath("/stock");
}

async function syncPartMachines(tx: Prisma.TransactionClient, partId: string, machineIds: string[]) {
  const uniqueIds = Array.from(new Set(machineIds.filter(Boolean)));
  await tx.partMachine.deleteMany({ where: { partId } });
  if (uniqueIds.length > 0) {
    await tx.partMachine.createMany({
      data: uniqueIds.map((machineId) => ({ partId, machineId })),
      skipDuplicates: true,
    });
  }
  return uniqueIds[0] ?? null;
}

async function maybeCreateLowStockAlert(
  tx: Prisma.TransactionClient,
  part: { id: string; designation: string; quantity: number; minStock: number },
) {
  if (part.quantity <= part.minStock) {
    await tx.gmaoAlert.create({
      data: {
        type: AlertType.STOCK_LOW,
        severity: part.quantity <= 0 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
        title: `Stock critique : ${part.designation}`,
        message: `Stock ${part.quantity} (seuil ${part.minStock}).`,
        metadata: { sparePartId: part.id } as Prisma.InputJsonValue,
      },
    });
  }
}

export async function createPartAction(formData: FormData): Promise<PartActionResult> {
  const auth = requireManageAction();
  if (!auth.ok) return { ok: false, error: auth.error };

  const parsed = partFormSchema.safeParse(parsePartForm(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().formErrors[0] ?? "Données invalides." };
  }

  const data = parsed.data;
  const storedImage = resolveStoredImageUrl(data);
  const initialQty = data.initialQuantity ?? 0;

  try {
    const id = await prisma.$transaction(async (tx) => {
      const primaryMachineId = data.machineIds[0] ?? null;
      const part = await tx.sparePart.create({
        data: {
          designation: data.designation,
          brand: data.brand ?? null,
          reference: data.reference ?? null,
          minStock: data.minStock,
          quantity: initialQty,
          imageUrl: storedImage ?? null,
          machineId: primaryMachineId,
        },
      });

      await syncPartMachines(tx, part.id, data.machineIds);

      if (initialQty > 0) {
        await tx.stockMovement.create({
          data: {
            partId: part.id,
            type: "ENTREE",
            quantity: initialQty,
            motif: "Stock initial",
          },
        });
      }

      if (initialQty <= data.minStock) {
        await maybeCreateLowStockAlert(tx, {
          id: part.id,
          designation: part.designation,
          quantity: initialQty,
          minStock: data.minStock,
        });
      }

      return part.id;
    });

    revalidateStockPaths();
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Échec création." };
  }
}

export async function updatePartAction(formData: FormData): Promise<PartActionResult> {
  const auth = requireManageAction();
  if (!auth.ok) return { ok: false, error: auth.error };

  const parsed = partUpdateSchema.safeParse(parsePartForm(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().formErrors[0] ?? "Données invalides." };
  }

  const data = parsed.data;
  const storedImage = resolveStoredImageUrl(data);

  try {
    await prisma.$transaction(async (tx) => {
      const primaryMachineId = await syncPartMachines(tx, data.id, data.machineIds);
      await tx.sparePart.update({
        where: { id: data.id },
        data: {
          designation: data.designation,
          brand: data.brand ?? null,
          reference: data.reference ?? null,
          minStock: data.minStock,
          ...(data.quantity != null ? { quantity: data.quantity } : {}),
          ...(storedImage !== undefined ? { imageUrl: storedImage ?? null } : {}),
          machineId: primaryMachineId,
        },
      });
    });

    revalidateStockPaths();
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Échec mise à jour." };
  }
}

export async function deletePartAction(id: string): Promise<PartActionResult> {
  const auth = requireManageAction();
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!id?.trim()) return { ok: false, error: "Pièce introuvable." };

  try {
    await prisma.sparePart.delete({ where: { id } });
    revalidateStockPaths();
    return { ok: true, id };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error && e.message.includes("Foreign key")
          ? "Suppression impossible : pièce utilisée dans une intervention."
          : e instanceof Error
            ? e.message
            : "Suppression impossible.",
    };
  }
}

export async function deletePartsBulkAction(ids: string[]): Promise<
  | { ok: true; deleted: number; ids: string[] }
  | { ok: false; error: string; failedIds?: string[] }
> {
  const auth = requireManageAction();
  if (!auth.ok) return { ok: false, error: auth.error };

  const unique = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
  if (unique.length === 0) return { ok: false, error: "Aucune pièce sélectionnée." };

  const deleted: string[] = [];
  const failedIds: string[] = [];

  for (const id of unique) {
    try {
      await prisma.sparePart.delete({ where: { id } });
      deleted.push(id);
    } catch {
      failedIds.push(id);
    }
  }

  if (deleted.length === 0) {
    return {
      ok: false,
      error: "Suppression impossible (pièces liées à des interventions).",
      failedIds,
    };
  }

  revalidateStockPaths();
  return { ok: true, deleted: deleted.length, ids: deleted };
}

export async function adjustStockAction(formData: FormData): Promise<PartActionResult> {
  const auth = requireManageAction();
  if (!auth.ok) return { ok: false, error: auth.error };

  const parsed = stockAdjustSchema.safeParse({
    partId: formData.get("partId")?.toString(),
    type: formData.get("type")?.toString(),
    quantity: formData.get("quantity")?.toString(),
    motif: formData.get("motif")?.toString(),
    date: formData.get("date")?.toString() || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().formErrors[0] ?? "Données invalides." };
  }

  const { partId, type, quantity, motif, date } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const part = await tx.sparePart.findUnique({ where: { id: partId } });
      if (!part) throw new Error("Pièce introuvable.");

      if (type === "SORTIE" && part.quantity < quantity) {
        throw new Error(`Stock insuffisant (${part.quantity} disponible).`);
      }

      await tx.stockMovement.create({
        data: {
          partId,
          type,
          quantity,
          motif: motif ?? (type === "ENTREE" ? "Réception commande" : "Sortie manuelle"),
          ...(date ? { date } : {}),
        },
      });

      const updated = await tx.sparePart.update({
        where: { id: partId },
        data: {
          quantity: type === "ENTREE" ? { increment: quantity } : { decrement: quantity },
        },
      });

      if (updated.quantity <= updated.minStock) {
        await maybeCreateLowStockAlert(tx, updated);
      }
    });

    revalidateStockPaths();
    return { ok: true, id: partId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Échec ajustement stock." };
  }
}