export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

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

export function clampPagination(page = 1, pageSize = DEFAULT_PAGE_SIZE, max = MAX_PAGE_SIZE) {
  const safePage = Math.max(1, Number.isFinite(page) ? Math.trunc(page) : 1);
  const safeSize = Math.min(max, Math.max(1, Number.isFinite(pageSize) ? Math.trunc(pageSize) : DEFAULT_PAGE_SIZE));
  return { page: safePage, pageSize: safeSize, skip: (safePage - 1) * safeSize };
}

export function paginatedMeta(total: number, page: number, pageSize: number): Omit<PaginatedResult<never>, "items"> {
  return {
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize) || 1),
  };
}

export function hrefWithPage(pathname: string, search: string, page: number): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  if (page <= 1) params.delete("page");
  else params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
