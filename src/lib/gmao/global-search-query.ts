import type { Prisma } from "@prisma/client";

import type { SessionUser } from "@/lib/auth/session";
import { canManage } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import type { GlobalSearchHit, GlobalSearchResponse, GlobalSearchScope } from "@/lib/gmao/global-search-types";
import { interventionTypeFr } from "@/lib/view/labels";
import { operationTypeFr } from "@/lib/view/gmao-labels";

const RESULT_LIMIT = 5;

function emptyResponse(): GlobalSearchResponse {
  return { machines: [], maintenance: [], parts: [] };
}

function buildMachineWhere(needle: string): Prisma.MachineWhereInput {
  const or: Prisma.MachineWhereInput[] = [
    { name: { contains: needle, mode: "insensitive" } },
    { location: { contains: needle, mode: "insensitive" } },
    { qrCode: { contains: needle, mode: "insensitive" } },
    { description: { contains: needle, mode: "insensitive" } },
  ];
  const matricule = Number.parseInt(needle, 10);
  if (!Number.isNaN(matricule)) {
    or.push({ legacyMatricule: matricule });
  }
  return { OR: or };
}

export async function runGlobalSearch(
  q: string,
  scope: GlobalSearchScope,
  user: SessionUser,
): Promise<GlobalSearchResponse> {
  const needle = q.trim();
  if (needle.length < 3) return emptyResponse();

  const showMachines = scope === "all" || scope === "machines";
  const showMaintenance = scope === "all" || scope === "maintenance";
  const showStock = canManage(user) && (scope === "all" || scope === "stock");
  const isTechnician = user.role === "TECHNICIEN";

  const [machines, maintenanceOrders, interventions, parts] = await Promise.all([
    showMachines
      ? prisma.machine.findMany({
          where: buildMachineWhere(needle),
          take: RESULT_LIMIT,
          orderBy: { name: "asc" },
          select: { id: true, name: true, location: true },
        })
      : Promise.resolve([]),
    showMaintenance
      ? prisma.maintenanceOrder.findMany({
          where: {
            OR: [
              { reference: { contains: needle, mode: "insensitive" } },
              { observationComment: { contains: needle, mode: "insensitive" } },
            ],
          },
          take: RESULT_LIMIT,
          orderBy: { plannedDate: "desc" },
          select: { id: true, reference: true, interventionType: true },
        })
      : Promise.resolve([]),
    showMaintenance
      ? prisma.maintenanceLog.findMany({
          where: {
            AND: [
              isTechnician && user.technicianId ? { technicianId: user.technicianId } : {},
              {
                OR: [
                  { operation: { contains: needle, mode: "insensitive" } },
                  { importSource: { contains: needle, mode: "insensitive" } },
                  { failureDescription: { contains: needle, mode: "insensitive" } },
                  { id: { contains: needle, mode: "insensitive" } },
                  {
                    maintenanceOrderLine: {
                      maintenanceOrder: {
                        reference: { contains: needle, mode: "insensitive" },
                      },
                    },
                  },
                ],
              },
            ],
          },
          take: RESULT_LIMIT,
          orderBy: { date: "desc" },
          select: {
            id: true,
            operationType: true,
            importSource: true,
            operation: true,
            maintenanceOrderLine: {
              select: { maintenanceOrder: { select: { reference: true } } },
            },
          },
        })
      : Promise.resolve([]),
    showStock
      ? prisma.sparePart.findMany({
          where: {
            OR: [
              { designation: { contains: needle, mode: "insensitive" } },
              { reference: { contains: needle, mode: "insensitive" } },
              { brand: { contains: needle, mode: "insensitive" } },
            ],
          },
          take: RESULT_LIMIT,
          orderBy: { designation: "asc" },
          select: { id: true, designation: true, reference: true, quantity: true },
        })
      : Promise.resolve([]),
  ]);

  const machineHits: GlobalSearchHit[] = machines.map((m) => ({
    id: m.id,
    kind: "machine",
    title: m.name,
    subtitle: m.location,
    href: `/machines?detail=${encodeURIComponent(m.id)}`,
  }));

  const orderHits: GlobalSearchHit[] = maintenanceOrders.map((o) => ({
    id: o.id,
    kind: "maintenance_order",
    title: o.reference,
    subtitle: interventionTypeFr(o.interventionType),
    href: `/maintenance-orders?detail=${encodeURIComponent(o.id)}`,
  }));

  const interventionHits: GlobalSearchHit[] = interventions.map((log) => {
    const omRef = log.maintenanceOrderLine?.maintenanceOrder.reference;
    const title = omRef ?? log.importSource ?? log.operation ?? `INT-${log.id.slice(0, 8)}`;
    return {
      id: log.id,
      kind: "intervention",
      title,
      subtitle: operationTypeFr(log.operationType),
      href: `/interventions?detail=${encodeURIComponent(log.id)}`,
    };
  });

  const maintenance = [...orderHits, ...interventionHits].slice(0, RESULT_LIMIT * 2);

  const partHits: GlobalSearchHit[] = parts.map((p) => ({
    id: p.id,
    kind: "part",
    title: p.designation,
    subtitle: p.reference ? `${p.reference} · Qté ${p.quantity}` : `Qté ${p.quantity}`,
    href: `/stock?detail=${encodeURIComponent(p.id)}`,
  }));

  return { machines: machineHits, maintenance, parts: partHits };
}
