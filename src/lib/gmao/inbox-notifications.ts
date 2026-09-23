import { revalidatePath, revalidateTag } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { CACHE_TAGS } from "@/lib/cache/tags";

export type InboxNotificationVm = {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  href: string | null;
  createdAt: string;
};

export type InboxSnapshot = {
  unread: number;
  items: InboxNotificationVm[];
};

function hrefFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const rec = metadata as Record<string, unknown>;
  if (typeof rec.href === "string" && rec.href.startsWith("/")) return rec.href;
  if (typeof rec.reference === "string" && rec.reference.startsWith("OM-")) {
    return `/maintenance-orders?q=${encodeURIComponent(rec.reference)}`;
  }
  if (rec.type === "STOCK_LOW" || typeof rec.sparePartId === "string") return "/stock";
  return null;
}

export async function listInboxNotifications(limit = 20): Promise<InboxSnapshot> {
  const [unread, rows] = await prisma.$transaction([
    prisma.gmaoAlert.count({ where: { resolvedAt: null } }),
    prisma.gmaoAlert.findMany({
      where: { resolvedAt: null },
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      select: { id: true, type: true, severity: true, title: true, message: true, metadata: true, createdAt: true },
    }),
  ]);

  return {
    unread,
    items: rows.map((row) => ({
      id: row.id,
      type: row.type,
      severity: row.severity,
      title: row.title,
      message: row.message,
      href: hrefFromMetadata(row.metadata) ?? (row.type === "WATER_QUALITY" ? "/water-quality" : row.type === "STOCK_LOW" ? "/stock" : "/maintenance-orders"),
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

export async function markAlertRead(id: string): Promise<void> {
  await prisma.gmaoAlert.updateMany({ where: { id, resolvedAt: null }, data: { resolvedAt: new Date() } });
  revalidateTag(CACHE_TAGS.alerts);
  revalidateTag(CACHE_TAGS.dashboard);
  revalidatePath("/dashboard");
}

export async function markAllAlertsRead(): Promise<number> {
  const result = await prisma.gmaoAlert.updateMany({ where: { resolvedAt: null }, data: { resolvedAt: new Date() } });
  revalidateTag(CACHE_TAGS.alerts);
  revalidateTag(CACHE_TAGS.dashboard);
  revalidatePath("/dashboard");
  return result.count;
}
