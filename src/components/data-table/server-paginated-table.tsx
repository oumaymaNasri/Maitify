"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GMAO_TABLE_HEAD, GMAO_TABLE_WRAP } from "@/components/gmao/table-styles";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { paginationRange } from "@/lib/db/pagination";

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
  filterPlaceholder = "Rechercher…",
  queryParam = "q",
}: ServerPaginatedTableProps<TData, TValue>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = React.useState(initialQuery);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

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

  const onQueryChange = React.useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        pushParams({ [queryParam]: value.trim() || null, page: "1" });
      }, 300);
    },
    [pushParams, queryParam],
  );

  React.useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount,
  });

  const { from, to } = React.useMemo(() => paginationRange(page, pageSize, total), [page, pageSize, total]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:max-w-sm">
        <Label htmlFor="server-table-filter" className="sr-only">
          Recherche
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            id="server-table-filter"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={filterPlaceholder}
            className="border-slate-200 bg-white pl-9 text-slate-900"
          />
        </div>
        {isPending ? <p className="text-xs text-slate-600">Chargement…</p> : null}
      </div>

      <div className={`${GMAO_TABLE_WRAP} ${isPending ? "opacity-60" : ""}`}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="border-0 hover:bg-transparent">
                {hg.headers.map((h) => (
                  <TableHead key={h.id} className={GMAO_TABLE_HEAD}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="border-slate-100 transition-colors hover:bg-slate-50">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="align-top text-slate-700">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-28 text-center text-slate-600">
                  Aucun enregistrement.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-sm text-slate-600">
          Lignes {from}–{to} sur {total}
          {initialQuery ? (
            <>
              {" "}
              · filtre « {initialQuery} »
            </>
          ) : null}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || isPending}
            onClick={() => pushParams({ page: String(page - 1) })}
          >
            <ChevronLeft className="h-4 w-4" />
            Préc.
          </Button>
          <span className="text-sm tabular-nums text-slate-600">
            Page {page} / {pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= pageCount || isPending}
            onClick={() => pushParams({ page: String(page + 1) })}
          >
            Suiv.
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
