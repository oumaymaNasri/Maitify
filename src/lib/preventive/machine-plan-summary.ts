import { prisma } from "@/lib/db/prisma";
import { preventiveFrequencyFr } from "@/lib/preventive/labels";
import { isPreventivePersistenceReady } from "@/lib/preventive/persistence";
import { nextOccurrenceForPlan } from "@/lib/preventive/plans-query";
import { toPlanScheduleInput } from "@/lib/preventive/schedule-input";

export type MachinePlanItem = {
  id: string;
  title: string;
  typeLabel: string;
  status: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  frequencyLabel: string;
  assigneeName: string | null;
  nextDate: string | null;
  nextTime: string | null;
  overdueCount: number;
};

export type MachinePlanSummary = {
  activeCount: number;
  /** Plan actif dont l'échéance est la plus proche (ou null). */
  next: MachinePlanItem | null;
  plans: MachinePlanItem[];
};

/**
 * Plans préventifs par machine (fiche + carte). Lecture seule ; renvoie {} si les tables
 * du planning ne sont pas disponibles.
 */
export async function fetchMachinePlanSummaries(machineIds: string[]): Promise<Record<string, MachinePlanSummary>> {
  if (machineIds.length === 0) return {};
  try {
    if (!(await isPreventivePersistenceReady())) return {};
    const [plans, overdue] = await Promise.all([
      prisma.preventiveMaintenancePlan.findMany({
        where: { machineId: { in: machineIds }, status: { not: "ARCHIVED" } },
        include: {
          maintenanceType: { select: { label: true } },
          assignee: { select: { firstName: true, lastName: true } },
          scheduleRules: { orderBy: { sortOrder: "asc" } },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.maintenanceOccurrence.groupBy({
        by: ["planId"],
        where: { status: "OVERDUE", plan: { machineId: { in: machineIds } } },
        _count: { _all: true },
      }),
    ]);
    const overdueByPlan = new Map(overdue.map((o) => [o.planId, o._count._all]));

    const out: Record<string, MachinePlanSummary> = {};
    for (const p of plans) {
      const next = nextOccurrenceForPlan(toPlanScheduleInput(p));
      const item: MachinePlanItem = {
        id: p.id,
        title: p.title,
        typeLabel: p.maintenanceType.label,
        status: p.status,
        frequencyLabel: `${preventiveFrequencyFr(p.frequency)}${p.occurrencesPerPeriod > 1 ? ` · ${p.occurrencesPerPeriod}×` : ""}`,
        assigneeName: p.assignee ? `${p.assignee.lastName} ${p.assignee.firstName}`.trim() : null,
        nextDate: next?.date ?? null,
        nextTime: next?.time ?? null,
        overdueCount: overdueByPlan.get(p.id) ?? 0,
      };
      const entry = (out[p.machineId] ??= { activeCount: 0, next: null, plans: [] });
      entry.plans.push(item);
      if (p.status === "ACTIVE") {
        entry.activeCount += 1;
        const cur = entry.next;
        const key = (i: MachinePlanItem | null) => (i?.nextDate ? `${i.nextDate} ${i.nextTime ?? ""}` : "9999");
        if (!cur || key(item) < key(cur)) entry.next = item;
      }
    }
    return out;
  } catch (err) {
    console.error("[machine-plan-summary]", err);
    return {};
  }
}
