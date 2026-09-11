/** Clé Suspense stable — évite JSON.stringify(searchParams) qui remonte tout l'arbre */
export function paginationSearchKey(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): string {
  if (!searchParams) return "p=1|s=20|q=";
  const page = String(Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page ?? "1");
  const pageSize = String(
    Array.isArray(searchParams.pageSize) ? searchParams.pageSize[0] : searchParams.pageSize ?? "",
  );
  const q = String(Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q ?? "").trim();
  return `p=${page}|s=${pageSize}|q=${q}`;
}
