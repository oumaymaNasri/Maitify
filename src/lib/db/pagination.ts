export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

export type PaginationParams = {
  page: number;
  pageSize: number;
  q: string;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export function parsePaginationParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  defaults?: Partial<PaginationParams>,
): PaginationParams {
  const rawPage = searchParams?.page;
  const rawSize = searchParams?.pageSize;
  const rawQ = searchParams?.q;

  const page = Math.max(1, Number.parseInt(String(Array.isArray(rawPage) ? rawPage[0] : rawPage ?? defaults?.page ?? 1), 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(
      1,
      Number.parseInt(String(Array.isArray(rawSize) ? rawSize[0] : rawSize ?? defaults?.pageSize ?? DEFAULT_PAGE_SIZE), 10) ||
        DEFAULT_PAGE_SIZE,
    ),
  );
  const q = String(Array.isArray(rawQ) ? rawQ[0] : rawQ ?? defaults?.q ?? "").trim();

  return { page, pageSize, q };
}

export function paginationRange(page: number, pageSize: number, total: number) {
  if (total === 0) return { from: 0, to: 0 };
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return { from, to };
}
