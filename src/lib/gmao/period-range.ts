import { calendarDayKey } from "@/lib/gmao/intervention-status";

export type PeriodPreset = "all" | "week" | "month" | "custom";

export function parsePeriodPreset(raw?: string | null): PeriodPreset {
  if (raw === "week" || raw === "month" || raw === "custom") return raw;
  return "all";
}

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function utcFromDayKey(dayKey: string): Date {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Semaine calendaire lundi–dimanche (Africa/Tunis). */
export function currentWeekRange(now = new Date()): { dateFrom: string; dateTo: string } {
  const today = utcFromDayKey(calendarDayKey(now));
  const weekday = today.getUTCDay();
  const offset = weekday === 0 ? 6 : weekday - 1;
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - offset);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return { dateFrom: ymd(start), dateTo: ymd(end) };
}

export function currentMonthRange(now = new Date()): { dateFrom: string; dateTo: string } {
  const [y, m] = calendarDayKey(now).split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0));
  return { dateFrom: ymd(start), dateTo: ymd(end) };
}

export function applyPeriodPreset(
  period: PeriodPreset,
  dateFrom: string,
  dateTo: string,
  now = new Date(),
): { dateFrom: string; dateTo: string } {
  if (period === "week") return currentWeekRange(now);
  if (period === "month") return currentMonthRange(now);
  if (period === "all") return { dateFrom: "", dateTo: "" };
  return { dateFrom, dateTo };
}
