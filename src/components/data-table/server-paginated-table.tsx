"use client";

import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useTransition } from "react";

import { GmaoStandardTable, GmaoTablePagination } from "@/components/gmao/gmao-table";
import { ModuleFilterBar } from "@/components/gmao/premium/module-filter-bar";
import { hrefWithPage } from "@/lib/db/pagination";

type ServerPaginatedTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  initialQuery?: string;
  filterPlaceholder?: string;
  queryParam?: string;
};

export function ServerPaginatedTable<TData, TValue>({
  columns,
  data,
  total,
  page,
  pageSize,
  pageCount,
  initialQuery = "",
  filterPlaceholder = "Recherche par nom ou ID…",
  queryParam = "q",
}: ServerPaginatedTableProps<TData, TValue>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const pushParams = React.useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      }
      startTransition(() => {
        router.push(`${pathname}?${next.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const handleSearch = React.useCallback(
    (value: string) => {
      pushParams({ [queryParam]: value.trim() || null, page: null });
    },
    [pushParams, queryParam],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-3">
      <ModuleFilterBar
        layout="inline"
        onDebouncedSearchChange={handleSearch}
        searchPlaceholder={filterPlaceholder}
        searchInitialValue={initialQuery}
        filters={[]}
        resultCount={total}
      />
      {isPending ? <p className="text-xs text-[#1F76FB]">Chargement…</p> : null}
      <GmaoStandardTable table={table} emptyMessage="Aucun enregistrement." isPending={isPending} />
      <GmaoTablePagination
        total={total}
        noun="résultat(s)"
        page={page}
        pageCount={pageCount}
        pageSize={pageSize}
        previousHref={hrefWithPage(pathname, searchParams.toString(), Math.max(1, page - 1))}
        nextHref={hrefWithPage(pathname, searchParams.toString(), page + 1)}
      />
    </div>
  );
}
