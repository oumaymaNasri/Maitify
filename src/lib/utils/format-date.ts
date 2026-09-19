const PARIS_TZ = "Europe/Paris";

/** Date courte française jj/mm/aaaa (stable SSR/client). */
export function formatDateFrShort(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: PARIS_TZ,
  }).format(new Date(iso));
}

export function formatDateFrShortWithTime(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: PARIS_TZ,
  }).format(new Date(iso));
}

export function formatDurationMinutes(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes)) return "—";
  return `${Math.max(0, Math.round(minutes))} min`;
}

export function formatDateFrMedium(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeZone: PARIS_TZ,
  }).format(new Date(iso));
}

export function formatDateFrLongWithTime(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: PARIS_TZ,
  }).format(new Date(iso));
}
