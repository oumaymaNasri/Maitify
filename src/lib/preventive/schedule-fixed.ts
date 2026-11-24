import {
  addDays,
  clampCivilDay,
  compareCivil,
  eachDayInclusive,
  endOfIsoWeek,
  formatCivilDate,
  maxCivil,
  minCivil,
  parseCivilDate,
  periodKeyDaily,
  periodKeyMonthly,
  periodKeyWeekly,
  periodKeyYearly,
  startOfIsoWeek,
  weekdayMon1,
} from "@/lib/preventive/calendar";
import { buildOccurrenceKey } from "@/lib/preventive/constants";
import { applySundayPolicy } from "@/lib/preventive/sunday-policy";
import type {
  CivilDate,
  ComputedOccurrence,
  HorizonInput,
  PlanScheduleInput,
  ScheduleSlotInput,
} from "@/lib/preventive/types";
import { plannedAtUtcIso } from "@/lib/preventive/calendar";

function sortedRules(plan: PlanScheduleInput): ScheduleSlotInput[] {
  return [...plan.scheduleRules].sort((a, b) => a.sortOrder - b.sortOrder);
}

function withinPlanValidity(date: CivilDate, plan: PlanScheduleInput): boolean {
  const start = parseCivilDate(plan.startDate);
  if (compareCivil(date, start) < 0) return false;
  if (plan.endDate) {
    const end = parseCivilDate(plan.endDate);
    if (compareCivil(date, end) > 0) return false;
  }
  return true;
}

function emit(
  plan: PlanScheduleInput,
  periodKey: string,
  occurrenceIndex: number,
  theoretical: CivilDate,
  timeLocal: string,
): ComputedOccurrence | null {
  if (!withinPlanValidity(theoretical, plan)) return null;
  const theoreticalDate = formatCivilDate(theoretical);
  const sunday = applySundayPolicy({
    theoreticalDate,
    theoreticalTime: timeLocal,
    includeSunday: plan.includeSunday,
    sundayPolicy: plan.sundayPolicy,
  });

  const occurrenceKey = buildOccurrenceKey({
    planId: plan.planId,
    periodKey,
    occurrenceIndex,
    theoreticalDate,
    theoreticalTime: timeLocal,
  });

  return {
    planId: plan.planId,
    planVersion: plan.planVersion,
    machineId: plan.machineId,
    occurrenceIndex,
    periodKey,
    theoreticalDate,
    theoreticalTime: timeLocal,
    plannedDate: sunday.plannedDate,
    plannedTime: sunday.plannedTime,
    plannedAtUtc:
      sunday.plannedDate && sunday.plannedTime
        ? plannedAtUtcIso(sunday.plannedDate, sunday.plannedTime, plan.timezone)
        : null,
    sundayAdjustment: sunday.sundayAdjustment,
    status: sunday.status,
    occurrenceKey,
    estimatedDurationMin: plan.estimatedDurationMin,
  };
}

function iterateDailyPeriods(from: CivilDate, to: CivilDate): CivilDate[] {
  return eachDayInclusive(from, to);
}

function iterateWeeklyMondays(from: CivilDate, to: CivilDate): CivilDate[] {
  const first = startOfIsoWeek(from);
  const last = startOfIsoWeek(to);
  const out: CivilDate[] = [];
  let cur = first;
  while (compareCivil(cur, last) <= 0) {
    out.push(cur);
    cur = addDays(cur, 7);
  }
  return out;
}

function iterateMonths(from: CivilDate, to: CivilDate): Array<{ y: number; m: number }> {
  const out: Array<{ y: number; m: number }> = [];
  let y = from.y;
  let m = from.m;
  while (y < to.y || (y === to.y && m <= to.m)) {
    out.push({ y, m });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

function iterateYears(from: CivilDate, to: CivilDate): number[] {
  const out: number[] = [];
  for (let y = from.y; y <= to.y; y++) out.push(y);
  return out;
}

/**
 * Mode FIXED — slots fournis par l'utilisateur.
 * DAILY : N horaires chaque jour de la fenêtre (weekday ignore).
 * WEEKLY : N couples (weekday + time) par semaine ISO.
 * MONTHLY : N couples (monthDay + time) par mois (clamp).
 * YEARLY : N couples (month + monthDay + time) par année (clamp).
 */
export function computeFixedOccurrences(
  plan: PlanScheduleInput,
  horizon: HorizonInput,
): ComputedOccurrence[] {
  const rules = sortedRules(plan);
  if (rules.length !== plan.occurrencesPerPeriod) {
    throw new Error(
      `Mode FIXED: ${rules.length} créneau(x) pour occurrencesPerPeriod=${plan.occurrencesPerPeriod}.`,
    );
  }

  const from = parseCivilDate(horizon.from);
  const to = parseCivilDate(horizon.to);
  if (compareCivil(from, to) > 0) return [];

  const planStart = parseCivilDate(plan.startDate);
  const planEnd = plan.endDate ? parseCivilDate(plan.endDate) : null;
  const effFrom = maxCivil(from, planStart);
  const effTo = planEnd ? minCivil(to, planEnd) : to;
  if (compareCivil(effFrom, effTo) > 0) return [];

  const out: ComputedOccurrence[] = [];

  switch (plan.frequency) {
    case "DAILY": {
      for (const day of iterateDailyPeriods(effFrom, effTo)) {
        const pk = periodKeyDaily(day);
        rules.forEach((rule, i) => {
          const occ = emit(plan, pk, i, day, rule.timeLocal);
          if (occ) out.push(occ);
        });
      }
      break;
    }
    case "WEEKLY": {
      for (const monday of iterateWeeklyMondays(effFrom, effTo)) {
        const weekEnd = endOfIsoWeek(monday);
        // Ne générer la semaine que si elle intersecte la fenêtre effective
        if (compareCivil(weekEnd, effFrom) < 0 || compareCivil(monday, effTo) > 0) continue;
        const anchor = monday;
        const pk = periodKeyWeekly(anchor);
        rules.forEach((rule, i) => {
          const wd = rule.weekday;
          if (!wd || wd < 1 || wd > 7) {
            throw new Error(`Slot hebdomadaire invalide (weekday) sortOrder=${rule.sortOrder}.`);
          }
          const day = addDays(monday, wd - 1);
          if (compareCivil(day, effFrom) < 0 || compareCivil(day, effTo) > 0) return;
          const occ = emit(plan, pk, i, day, rule.timeLocal);
          if (occ) out.push(occ);
        });
      }
      break;
    }
    case "MONTHLY": {
      for (const { y, m } of iterateMonths(effFrom, effTo)) {
        const pk = periodKeyMonthly({ y, m, d: 1 });
        rules.forEach((rule, i) => {
          const md = rule.monthDay;
          if (!md || md < 1 || md > 31) {
            throw new Error(`Slot mensuel invalide (monthDay) sortOrder=${rule.sortOrder}.`);
          }
          const day = clampCivilDay(y, m, md);
          if (compareCivil(day, effFrom) < 0 || compareCivil(day, effTo) > 0) return;
          const occ = emit(plan, pk, i, day, rule.timeLocal);
          if (occ) out.push(occ);
        });
      }
      break;
    }
    case "YEARLY": {
      for (const y of iterateYears(effFrom, effTo)) {
        const pk = periodKeyYearly({ y, m: 1, d: 1 });
        rules.forEach((rule, i) => {
          const month = rule.month;
          const md = rule.monthDay;
          if (!month || month < 1 || month > 12 || !md || md < 1 || md > 31) {
            throw new Error(`Slot annuel invalide sortOrder=${rule.sortOrder}.`);
          }
          const day = clampCivilDay(y, month, md);
          if (compareCivil(day, effFrom) < 0 || compareCivil(day, effTo) > 0) return;
          const occ = emit(plan, pk, i, day, rule.timeLocal);
          if (occ) out.push(occ);
        });
      }
      break;
    }
  }

  // Tri déterministe
  out.sort((a, b) => {
    const da = a.plannedDate ?? a.theoreticalDate;
    const db = b.plannedDate ?? b.theoreticalDate;
    if (da !== db) return da < db ? -1 : 1;
    const ta = a.plannedTime ?? a.theoreticalTime;
    const tb = b.plannedTime ?? b.theoreticalTime;
    if (ta !== tb) return ta < tb ? -1 : 1;
    return a.occurrenceKey.localeCompare(b.occurrenceKey);
  });

  return out;
}

/** Utilitaire test : weekday d'une date ISO. */
export function weekdayOf(iso: string): number {
  return weekdayMon1(parseCivilDate(iso));
}
