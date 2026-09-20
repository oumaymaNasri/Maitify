export const DEFAULT_PAGE_SIZE = 50;
/** Plafond de sécurité pour « Tous » : virtualisation côté tableau, jamais de take illimité. */
export const ALL_PAGE_SIZE = 20_000;
export const MAX_PAGE_SIZE = ALL_PAGE_SIZE;

export type PageSizeChoice = "50" | "100" | "500" | "1000" | "all";

export const PAGE_SIZE_SELECT_OPTIONS: { value: PageSizeChoice; label: string }[] = [
  { value: "50", label: "50" },
  { value: "100", label: "100" },
  { value: "500", label: "500" },
  { value: "1000", label: "1 000" },
  { value: "all", label: "Tous" },
];

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

export function parsePageSize(raw?: string | null, fallback = DEFAULT_PAGE_SIZE): number {
  if (!raw?.trim()) return fallback;
  const v = raw.trim().toLowerCase();
  if (v === "all" || v === "tous") return ALL_PAGE_SIZE;
  const n = Number.parseInt(v, 10);
  if (n === 50 || n === 100 || n === 500 || n === 1000) return n;
  if (Number.isFinite(n) && n >= ALL_PAGE_SIZE) return ALL_PAGE_SIZE;
  return fallback;
}

export function pageSizeSelectValue(pageSize: number): PageSizeChoice {
  if (pageSize >= ALL_PAGE_SIZE) return "all";
  if (pageSize === 100 || pageSize === 500 || pageSize === 1000) return String(pageSize) as PageSizeChoice;
  return "50";
}

export function pageSizeQueryValue(pageSize: number): string | null {
  const v = pageSizeSelectValue(pageSize);
  return v === "50" ? null : v;
}

export function parsePaginationParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  defaults?: Partial<PaginationParams>,
): PaginationParams {
  const rawPage = searchParams?.page;
  const rawSize = searchParams?.pageSize;
  const rawQ = searchParams?.q;

  const page = Math.max(1, Number.parseInt(String(Array.isArray(rawPage) ? rawPage[0] : rawPage ?? defaults?.page ?? 1), 10) || 1);
  const pageSize = parsePageSize(
    String(Array.isArray(rawSize) ? rawSize[0] : rawSize ?? ""),
    defaults?.pageSize ?? DEFAULT_PAGE_SIZE,
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

export function clampPagination(page = 1, pageSize = DEFAULT_PAGE_SIZE, max = ALL_PAGE_SIZE) {
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

export function hrefWithPageSize(pathname: string, search: string, size: PageSizeChoice): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  params.delete("page");
  if (size === "50") params.delete("pageSize");
  else params.set("pageSize", size);
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
