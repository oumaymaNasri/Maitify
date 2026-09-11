/** Recherche floue : sous-chaîne ou caractères du terme dans l'ordre. */
export function fuzzyMatch(needle: string, haystack: string): boolean {
  const n = needle.trim().toLowerCase();
  const h = haystack.toLowerCase();
  if (!n) return true;
  if (h.includes(n)) return true;
  let i = 0;
  for (const c of n) {
    const j = h.indexOf(c, i);
    if (j === -1) return false;
    i = j + 1;
  }
  return true;
}
