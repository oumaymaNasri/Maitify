import type { PreventiveFrequency, PreventivePlanStatus, PreventiveScheduleMode } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { designMaintenanceTypeOptions, type MaintenanceTypeOption } from "@/lib/preventive/catalog";
import { isPreventivePersistenceReady } from "@/lib/preventive/persistence";
import { computeOccurrences } from "@/lib/preventive/compute-occurrences";
import type { PlanScheduleInput } from "@/lib/preventive/types";
import { PREVENTIVE_TIMEZONE } from "@/lib/preventive/constants";
import { todayTunisApprox, addDaysIso } from "@/lib/preventive/preview-adapter";
import { syncOccurrenceStatuses } from "@/lib/preventive/generate-orders";
import { toPlanScheduleInput } from "@/lib/preventive/schedule-input";

export { toPlanScheduleInput };

export type PreventivePlanListItem = {
  id: string;
  code: string;
  title: string;
  machineId: string;
  machineName: string;
  maintenanceTypeId: string;
  maintenanceTypeLabel: string;
  maintenanceTypeCode: string;
  frequency: PreventiveFrequency;
  occurrencesPerPeriod: number;
  scheduleMode: PreventiveScheduleMode;
  status: PreventivePlanStatus;
  includeSunday: boolean;
  sundayPolicy: "PREV_SATURDAY" | "NEXT_MONDAY" | "SKIP";
  assigneeName: string | null;
  nextOccurrenceDate: string | null;
  nextOccurrenceTime: string | null;
  overdueCount: number;
  estimatedDurationMin: number | null;
  /** Entrée moteur sérialisable (calendrier client). */
  scheduleInput: PlanScheduleInput;
  /** Valeurs initiales du formulaire (édition en modal). */
  formInitial: PlanFormInitial;
};

export type PlanFormInitial = {
  machineId: string;
  maintenanceTypeId: string;
  title: string;
  description: string;
  instructions: string;
  frequency: PreventiveFrequency;
  occurrencesPerPeriod: number;
  scheduleMode: PreventiveScheduleMode;
  includeSunday: boolean;
  sundayPolicy: "PREV_SATURDAY" | "NEXT_MONDAY" | "SKIP";
  startDate: string;
  endDate: string;
  estimatedDurationMin?: number;
  assigneeTechnicianId: string;
  status: PreventivePlanStatus;
  defaultTimes: string[];
  scheduleRules: { sortOrder: number; weekday: number | null; monthDay: number | null; month: number | null; timeLocal: string }[];
};

export function planToFormInitial(p: {
  machineId: string;
  maintenanceTypeId: string;
  title: string;
  description: string | null;
  instructions: string | null;
  frequency: PreventiveFrequency;
  occurrencesPerPeriod: number;
  scheduleMode: PreventiveScheduleMode;
  includeSunday: boolean;
  sundayPolicy: "PREV_SATURDAY" | "NEXT_MONDAY" | "SKIP";
  startDate: Date;
  endDate: Date | null;
  estimatedDurationMin: number | null;
  assigneeTechnicianId: string | null;
  status: PreventivePlanStatus;
  defaultTimes: string[];
  scheduleRules: { sortOrder: number; weekday: number | null; monthDay: number | null; month: number | null; timeLocal: string }[];
}): PlanFormInitial {
  return {
    machineId: p.machineId,
    maintenanceTypeId: p.maintenanceTypeId,
    title: p.title,
    description: p.description ?? "",
    instructions: p.instructions ?? "",
    frequency: p.frequency,
    occurrencesPerPeriod: p.occurrencesPerPeriod,
    scheduleMode: p.scheduleMode,
    includeSunday: p.includeSunday,
    sundayPolicy: p.sundayPolicy,
    startDate: p.startDate.toISOString().slice(0, 10),
    endDate: p.endDate ? p.endDate.toISOString().slice(0, 10) : "",
    estimatedDurationMin: p.estimatedDurationMin ?? undefined,
    assigneeTechnicianId: p.assigneeTechnicianId ?? "",
    status: p.status,
    defaultTimes: p.defaultTimes,
    scheduleRules: p.scheduleRules.map((r) => ({
      sortOrder: r.sortOrder,
      weekday: r.weekday,
      monthDay: r.monthDay,
      month: r.month,
      timeLocal: r.timeLocal,
    })),
  };
}

export type PreventivePlanningPageData = {
  persistenceReady: boolean;
  plans: PreventivePlanListItem[];
  maintenanceTypes: MaintenanceTypeOption[];
  machines: { id: string; name: string; legacyMatricule: number | null }[];
  technicians: { id: string; label: string }[];
};

export function nextOccurrenceForPlan(input: PlanScheduleInput): { date: string; time: string } | null {
  if (input.status !== "ACTIVE") return null;
  const from = todayTunisApprox();
  const to = addDaysIso(from, 90);
  try {
    const { occurrences } = computeOccurrences(input, { from, to });
    const next = occurrences.find((o) => o.plannedDate && o.status === "PLANNED");
    if (!next?.plannedDate || !next.plannedTime) return null;
    return { date: next.plannedDate, time: next.plannedTime };
  } catch {
    return null;
  }
}

export async function loadPreventivePlanningPageData(): Promise<PreventivePlanningPageData> {
  const [machines, technicians] = await Promise.all([
    prisma.machine.findMany({
      select: { id: true, name: true, legacyMatricule: true },
      orderBy: { name: "asc" },
      take: 5000,
    }),
    prisma.technician.findMany({
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 2000,
    }),
  ]);

  const techOptions = technicians.map((t) => ({
    id: t.id,
    label: `${t.lastName} ${t.firstName}`.trim(),
  }));

  const persistenceReady = await isPreventivePersistenceReady();
  if (!persistenceReady) {
    return {
      persistenceReady: false,
      plans: [],
      maintenanceTypes: designMaintenanceTypeOptions(),
      machines,
      technicians: techOptions,
    };
  }

  try {
    await syncOccurrenceStatuses();
  } catch (err) {
    console.error("[preventive] sync statuts", err);
  }

  const [types, plans, overdueGroups] = await Promise.all([
    prisma.maintenanceType.findMany({
      where: { status: "ACTIVE" },
      orderBy: { label: "asc" },
      select: { id: true, code: true, label: true, defaultDurationMin: true },
    }),
    prisma.preventiveMaintenancePlan.findMany({
      orderBy: [{ updatedAt: "desc" }],
      take: 500,
      include: {
        machine: { select: { id: true, name: true } },
        maintenanceType: { select: { id: true, code: true, label: true } },
        assignee: { select: { firstName: true, lastName: true } },
        scheduleRules: { orderBy: { sortOrder: "asc" } },
      },
    }),
    prisma.maintenanceOccurrence.groupBy({
      by: ["planId"],
      where: { status: "OVERDUE" },
      _count: { _all: true },
    }),
  ]);
  const overdueByPlan = new Map(overdueGroups.map((g) => [g.planId, g._count._all]));

  const list: PreventivePlanListItem[] = plans.map((p) => {
    const scheduleInput = toPlanScheduleInput(p);
    const next = nextOccurrenceForPlan(scheduleInput);
    return {
      id: p.id,
      code: `${p.maintenanceType.code}-${p.id.slice(-6).toUpperCase()}`,
      title: p.title,
      machineId: p.machineId,
      machineName: p.machine.name,
      maintenanceTypeId: p.maintenanceTypeId,
      maintenanceTypeLabel: p.maintenanceType.label,
      maintenanceTypeCode: p.maintenanceType.code,
      frequency: p.frequency,
      occurrencesPerPeriod: p.occurrencesPerPeriod,
      scheduleMode: p.scheduleMode,
      status: p.status,
      includeSunday: p.includeSunday,
      sundayPolicy: p.sundayPolicy,
      assigneeName: p.assignee ? `${p.assignee.lastName} ${p.assignee.firstName}`.trim() : null,
      nextOccurrenceDate: next?.date ?? null,
      nextOccurrenceTime: next?.time ?? null,
      overdueCount: overdueByPlan.get(p.id) ?? 0,
      estimatedDurationMin: p.estimatedDurationMin,
      scheduleInput,
      formInitial: planToFormInitial(p),
    };
  });

  return {
    persistenceReady: true,
    plans: list,
    maintenanceTypes: types.map((t) => ({
      id: t.id,
      code: t.code,
      label: t.label,
      defaultDurationMin: t.defaultDurationMin,
      fromDatabase: true,
    })),
    machines,
    technicians: techOptions,
  };
}

export async function loadPreventivePlanDetail(id: string) {
  const persistenceReady = await isPreventivePersistenceReady();
  if (!persistenceReady) return { persistenceReady: false as const, plan: null };

  const plan = await prisma.preventiveMaintenancePlan.findUnique({
    where: { id },
    include: {
      machine: { select: { id: true, name: true, location: true } },
      maintenanceType: true,
      assignee: { select: { id: true, firstName: true, lastName: true } },
      scheduleRules: { orderBy: { sortOrder: "asc" } },
      revisions: {
        orderBy: { version: "desc" },
        take: 20,
        include: { changedBy: { select: { name: true, email: true } } },
      },
    },
  });

  return { persistenceReady: true as const, plan };
}
