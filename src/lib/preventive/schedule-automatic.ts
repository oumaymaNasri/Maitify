import {
  addDays,
  compareCivil,
  eachDayInclusive,
  endOfIsoWeek,
  formatCivilDate,
  isWorkingDay,
  maxCivil,
  minCivil,
  parseCivilDate,
  periodKeyDaily,
  periodKeyMonthly,
  periodKeyWeekly,
  periodKeyYearly,
  plannedAtUtcIso,
  startOfIsoWeek,
} from "@/lib/preventive/calendar";
import { buildOccurrenceKey } from "@/lib/preventive/constants";
import { applySundayPolicy } from "@/lib/preventive/sunday-policy";
import type {
  CivilDate,
  ComputedOccurrence,
  HorizonInput,
  PlanScheduleInput,
} from "@/lib/preventive/types";

function resolveTimes(plan: PlanScheduleInput): string[] {
  const n = plan.occurrencesPerPeriod;
  const times = plan.defaultTimes;
  if (times.length === 0) throw new Error("Mode AUTOMATIC: defaultTimes requis.");
  if (times.length === 1) return Array.from({ length: n }, () => times[0]!);
  if (times.length === n) return [...times];
  throw new Error(`Mode AUTOMATIC: defaultTimes doit avoir 1 ou ${n} horaires.`);
}

/**
 * Sélection déterministe de N indices dans [0, length).
 * Espacement uniforme ; collisions d'index résolues par balayage droite puis gauche.
 */
export function selectUniformIndices(length: number, n: number): number[] {
  if (length <= 0 || n <= 0) return [];
  if (n >= length) return Array.from({ length }, (_, i) => i);
  if (n === 1) return [Math.floor((length - 1) / 2)];

  const raw = Array.from({ length: n }, (_, i) => Math.floor((i * (length - 1)) / (n - 1)));
  const used = new Set<number>();
  const result: number[] = [];

  for (const idx of raw) {
    if (!used.has(idx)) {
      used.add(idx);
      result.push(idx);
      continue;
    }
    let placed = false;
    for (let d = 1; d < length; d++) {
      const right = idx + d;
      if (right < length && !used.has(right)) {
        used.add(right);
        result.push(right);
        placed = true;
        break;
      }
      const left = idx - d;
      if (left >= 0 && !used.has(left)) {
        used.add(left);
        result.push(left);
        placed = true;
        break;
      }
    }
    if (!placed) {
      // saturation — ne devrait pas arriver si n <= length
      result.push(idx);
    }
  }

  return result.sort((a, b) => a - b);
}

function emitDayTimes(
  plan: PlanScheduleInput,
  periodKey: string,
  day: CivilDate,
  times: string[],
  startIndex = 0,
): ComputedOccurrence[] {
  const out: ComputedOccurrence[] = [];
  const theoreticalDate = formatCivilDate(day);

  times.forEach((timeLocal, i) => {
    const occurrenceIndex = startIndex + i;
    const sunday = applySundayPolicy({
      theoreticalDate,
      theoreticalTime: timeLocal,
      includeSunday: plan.includeSunday,
      sundayPolicy: plan.sundayPolicy,
    });
    out.push({
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
      occurrenceKey: buildOccurrenceKey({
        planId: plan.planId,
        periodKey,
        occurrenceIndex,
        theoreticalDate,
        theoreticalTime: timeLocal,
      }),
      estimatedDurationMin: plan.estimatedDurationMin,
    });
  });

  return out;
}

function candidatesInRange(
  from: CivilDate,
  to: CivilDate,
  includeSunday: boolean,
): CivilDate[] {
  return eachDayInclusive(from, to).filter((d) => isWorkingDay(d, includeSunday));
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

/**
 * Mode AUTOMATIC — répartition uniforme déterministe sur jours ouvrés de la période.
 * DAILY : N horaires sur chaque jour ouvré (équivalent grille horaire).
 */
export function computeAutomaticOccurrences(
  plan: PlanScheduleInput,
  horizon: HorizonInput,
): ComputedOccurrence[] {
  const times = resolveTimes(plan);
  const n = plan.occurrencesPerPeriod;

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
      for (const day of candidatesInRange(effFrom, effTo, plan.includeSunday)) {
        out.push(...emitDayTimes(plan, periodKeyDaily(day), day, times));
      }
      break;
    }
    case "WEEKLY": {
      for (const monday of iterateWeeklyMondays(effFrom, effTo)) {
        const sunday = endOfIsoWeek(monday);
        const rangeFrom = maxCivil(monday, effFrom);
        const rangeTo = minCivil(sunday, effTo);
        if (compareCivil(rangeFrom, rangeTo) > 0) continue;
        const candidates = candidatesInRange(rangeFrom, rangeTo, plan.includeSunday);
        if (candidates.length === 0) continue;
        const indices = selectUniformIndices(candidates.length, n);
        const pk = periodKeyWeekly(monday);
        indices.forEach((idx, i) => {
          const day = candidates[idx]!;
          const timeLocal = times[i] ?? times[0]!;
          out.push(...emitDayTimes(plan, pk, day, [timeLocal], i));
        });
      }
      break;
    }
    case "MONTHLY": {
      for (const { y, m } of iterateMonths(effFrom, effTo)) {
        const monthStart: CivilDate = { y, m, d: 1 };
        const monthEnd: CivilDate = { y, m, d: new Date(Date.UTC(y, m, 0)).getUTCDate() };
        const rangeFrom = maxCivil(monthStart, effFrom);
        const rangeTo = minCivil(monthEnd, effTo);
        if (compareCivil(rangeFrom, rangeTo) > 0) continue;
        const candidates = candidatesInRange(rangeFrom, rangeTo, plan.includeSunday);
        if (candidates.length === 0) continue;
        const indices = selectUniformIndices(candidates.length, n);
        const pk = periodKeyMonthly(monthStart);
        indices.forEach((idx, i) => {
          const day = candidates[idx]!;
          const timeLocal = times[i] ?? times[0]!;
          out.push(...emitDayTimes(plan, pk, day, [timeLocal], i));
        });
      }
      break;
    }
    case "YEARLY": {
      for (let y = effFrom.y; y <= effTo.y; y++) {
        const yearStart: CivilDate = { y, m: 1, d: 1 };
        const yearEnd: CivilDate = { y, m: 12, d: 31 };
        const rangeFrom = maxCivil(yearStart, effFrom);
        const rangeTo = minCivil(yearEnd, effTo);
        if (compareCivil(rangeFrom, rangeTo) > 0) continue;
        const candidates = candidatesInRange(rangeFrom, rangeTo, plan.includeSunday);
        if (candidates.length === 0) continue;
        const indices = selectUniformIndices(candidates.length, n);
        const pk = periodKeyYearly(yearStart);
        indices.forEach((idx, i) => {
          const day = candidates[idx]!;
          const timeLocal = times[i] ?? times[0]!;
          out.push(...emitDayTimes(plan, pk, day, [timeLocal], i));
        });
      }
      break;
    }
  }

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
