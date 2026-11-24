import { DEFAULT_WORKING_WEEKDAYS, PREVENTIVE_TIMEZONE } from "@/lib/preventive/constants";
import type { CivilDate } from "@/lib/preventive/types";

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function assertTimezone(tz: string | undefined): string {
  return tz?.trim() || PREVENTIVE_TIMEZONE;
}

export function parseCivilDate(iso: string): CivilDate {
  const m = DATE_RE.exec(iso.trim());
  if (!m) throw new Error(`Date civile invalide: ${iso}`);
  const y = Number(m[1]);
  const month = Number(m[2]);
  const d = Number(m[3]);
  if (month < 1 || month > 12 || d < 1 || d > 31) throw new Error(`Date civile invalide: ${iso}`);
  const dim = daysInMonth(y, month);
  if (d > dim) throw new Error(`Date civile invalide: ${iso}`);
  return { y, m: month, d };
}

export function formatCivilDate(date: CivilDate): string {
  return `${String(date.y).padStart(4, "0")}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
}

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInMonth(y: number, m: number): number {
  if (m === 2) return isLeapYear(y) ? 29 : 28;
  if ([4, 6, 9, 11].includes(m)) return 30;
  return 31;
}

/** Clamp jour du mois (29/02 hors bissextile → 28/02 ; 31 en mois court → dernier jour). */
export function clampCivilDay(y: number, m: number, d: number): CivilDate {
  const dim = daysInMonth(y, m);
  return { y, m, d: Math.min(Math.max(1, d), dim) };
}

export function compareCivil(a: CivilDate, b: CivilDate): number {
  if (a.y !== b.y) return a.y - b.y;
  if (a.m !== b.m) return a.m - b.m;
  return a.d - b.d;
}

export function civilEquals(a: CivilDate, b: CivilDate): boolean {
  return compareCivil(a, b) === 0;
}

export function addDays(date: CivilDate, days: number): CivilDate {
  const utc = Date.UTC(date.y, date.m - 1, date.d + days);
  const dt = new Date(utc);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

/** 1=lundi … 7=dimanche (ISO). */
export function weekdayMon1(date: CivilDate): number {
  const js = new Date(Date.UTC(date.y, date.m - 1, date.d)).getUTCDay(); // 0=dim
  return js === 0 ? 7 : js;
}

export function workingWeekdays(includeSunday: boolean): number[] {
  if (includeSunday) return [1, 2, 3, 4, 5, 6, 7];
  return [...DEFAULT_WORKING_WEEKDAYS];
}

export function isWorkingDay(date: CivilDate, includeSunday: boolean): boolean {
  return workingWeekdays(includeSunday).includes(weekdayMon1(date));
}

/** Lundi de la semaine ISO contenant `date`. */
export function startOfIsoWeek(date: CivilDate): CivilDate {
  const wd = weekdayMon1(date);
  return addDays(date, 1 - wd);
}

export function endOfIsoWeek(date: CivilDate): CivilDate {
  return addDays(startOfIsoWeek(date), 6);
}

/** Numéro de semaine ISO (1–53) et année ISO. */
export function isoWeekParts(date: CivilDate): { isoYear: number; week: number } {
  // Algorithme : jeudi de la semaine ISO détermine l'année.
  const monday = startOfIsoWeek(date);
  const thursday = addDays(monday, 3);
  const isoYear = thursday.y;
  const jan4: CivilDate = { y: isoYear, m: 1, d: 4 };
  const week1Monday = startOfIsoWeek(jan4);
  const diffDays =
    (Date.UTC(monday.y, monday.m - 1, monday.d) - Date.UTC(week1Monday.y, week1Monday.m - 1, week1Monday.d)) /
    86_400_000;
  const week = Math.floor(diffDays / 7) + 1;
  return { isoYear, week };
}

export function periodKeyDaily(date: CivilDate): string {
  return formatCivilDate(date);
}

export function periodKeyWeekly(date: CivilDate): string {
  const { isoYear, week } = isoWeekParts(date);
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

export function periodKeyMonthly(date: CivilDate): string {
  return `${date.y}-${String(date.m).padStart(2, "0")}`;
}

export function periodKeyYearly(date: CivilDate): string {
  return String(date.y);
}

export function eachDayInclusive(from: CivilDate, to: CivilDate): CivilDate[] {
  const out: CivilDate[] = [];
  let cur = from;
  while (compareCivil(cur, to) <= 0) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

export function minCivil(a: CivilDate, b: CivilDate): CivilDate {
  return compareCivil(a, b) <= 0 ? a : b;
}

export function maxCivil(a: CivilDate, b: CivilDate): CivilDate {
  return compareCivil(a, b) >= 0 ? a : b;
}

/**
 * Instant UTC ISO pour une date/heure civile Africa/Tunis.
 * Tunisie sans DST : équivalent UTC+01:00 toute l'année.
 */
export function plannedAtUtcIso(dateIso: string, timeLocal: string, timezone: string = PREVENTIVE_TIMEZONE): string {
  void assertTimezone(timezone);
  const { y, m, d } = parseCivilDate(dateIso);
  const [hh, mm] = timeLocal.split(":").map(Number);
  // Africa/Tunis = UTC+1 fixe
  const utcMs = Date.UTC(y, m - 1, d, hh - 1, mm, 0, 0);
  return new Date(utcMs).toISOString();
}

export function dateInInclusiveRange(date: CivilDate, from: CivilDate, to: CivilDate): boolean {
  return compareCivil(date, from) >= 0 && compareCivil(date, to) <= 0;
}
