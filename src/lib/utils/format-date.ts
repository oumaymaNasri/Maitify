const PARIS_TZ = "Europe/Paris";

/** Formatage stable SSR/client (évite les erreurs d'hydratation liées au fuseau). */
export function formatDateFrShort(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: PARIS_TZ,
  }).format(new Date(iso));
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
