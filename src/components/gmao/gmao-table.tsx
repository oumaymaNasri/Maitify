"use client";

import type { Header, Table as TanstackTable } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import * as React from "react";
import { Suspense } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  GMAO_TABLE_CELL,
  GMAO_TABLE_HEAD,
  GMAO_TABLE_SCROLL,
  GMAO_TABLE_WRAP,
} from "@/components/gmao/table-styles";
import { Button, ButtonLink } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  hrefWithPageSize,
  PAGE_SIZE_SELECT_OPTIONS,
  pageSizeSelectValue,
  type PageSizeChoice,
} from "@/lib/db/pagination";
import { cn } from "@/lib/utils";

export function GmaoRowCheckbox({
  checked,
  indeterminate,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate);
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      aria-label={ariaLabel}
      className="h-4 w-4 rounded border-slate-300 text-[#1F76FB] focus:ring-[#1F76FB]"
    />
  );
}

export function GmaoTablePagination({
  total,
  noun = "résultat(s)",
  page = 1,
  pageCount = 1,
  pageSize,
  previousHref,
  nextHref,
  onPrevious,
  onNext,
}: {
  total: number;
  noun?: string;
  page?: number;
  pageCount?: number;
  pageSize?: number;
  canPrevious?: boolean;
  canNext?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  previousHref?: string;
  nextHref?: string;
}) {
  const showSize = typeof pageSize === "number" && pageSize > 0;
  const hasPager = pageCount > 1 || Boolean(previousHref || nextHref || onPrevious || onNext) || showSize;
  const prevDisabled = page <= 1;
  const nextDisabled = page >= pageCount;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-600">
        <span className="font-semibold tabular-nums text-slate-900">{total.toLocaleString("fr-FR")}</span> {noun}
        {hasPager ? (
          <span className="ml-2 text-slate-500">
            · page <span className="tabular-nums text-slate-800">{page}</span> / {pageCount}
          </span>
        ) : null}
      </p>
      {hasPager ? (
        <div className="flex flex-wrap items-center gap-2">
          {showSize ? (
            <Suspense fallback={<span className="h-8 w-24 rounded-lg border border-slate-200 bg-slate-50" />}>
              <GmaoPageSizeSelect pageSize={pageSize} />
            </Suspense>
          ) : null}
          {previousHref && !prevDisabled ? (
            <ButtonLink href={previousHref} variant="outline" size="sm" className="h-8 rounded-lg" scroll={false}>
              Précédent
            </ButtonLink>
          ) : (
            <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg" disabled={prevDisabled} onClick={onPrevious}>
              Précédent
            </Button>
          )}
          {nextHref && !nextDisabled ? (
            <ButtonLink href={nextHref} variant="outline" size="sm" className="h-8 rounded-lg" scroll={false}>
              Suivant
            </ButtonLink>
          ) : (
            <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg" disabled={nextDisabled} onClick={onNext}>
              Suivant
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function GmaoPageSizeSelect({ pageSize }: { pageSize: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <label className="flex items-center gap-1.5 text-xs text-slate-600">
      <span className="whitespace-nowrap">Lignes</span>
      <select
        aria-label="Nombre de lignes par page"
        value={pageSizeSelectValue(pageSize)}
        onChange={(e) => {
          const size = e.target.value as PageSizeChoice;
          router.push(hrefWithPageSize(pathname, searchParams.toString(), size), { scroll: false });
        }}
        className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-800"
      >
        {PAGE_SIZE_SELECT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function GmaoBulkSelectBar({
  count,
  onBulkDelete,
}: {
  count: number;
  onBulkDelete: () => void;
}) {
  if (count <= 0) return null;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#1F76FB]/25 bg-[#E8F1FF] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-slate-800">
        <span className="tabular-nums text-[#1F76FB]">{count}</span> élément
        {count > 1 ? "s" : ""} sélectionné{count > 1 ? "s" : ""}
      </p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onBulkDelete}
        className="rounded-xl border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Supprimer la sélection
      </Button>
    </div>
  );
}

export function gmaoRowClass(index: number, selected?: boolean) {
  return cn(
    "border-slate-100 transition-colors hover:bg-[#E8F1FF]/50",
    index % 2 === 1 && "bg-slate-50/60",
    selected && "bg-[#E8F1FF]/30",
  );
}

function SortableHead<TData>({ header }: { header: Header<TData, unknown> }) {
  const canSort = header.column.getCanSort();
  const sorted = header.column.getIsSorted();
  const label = flexRender(header.column.columnDef.header, header.getContext());
  if (!canSort) return <>{label}</>;
  return (
    <button
      type="button"
      className="flex w-full items-center gap-1 text-left hover:text-[#1F76FB]"
      onClick={header.column.getToggleSortingHandler()}
    >
      <span className="truncate">{label}</span>
      {sorted ? <span className="text-[#1F76FB]">{sorted === "asc" ? "↑" : "↓"}</span> : null}
    </button>
  );
}

export function GmaoStandardTable<TData>({
  table,
  emptyMessage,
  selectedIdSet,
  getRowId,
  isPending,
}: {
  table: TanstackTable<TData>;
  emptyMessage: string;
  selectedIdSet?: Set<string>;
  getRowId?: (row: TData) => string;
  isPending?: boolean;
}) {
  const rows = table.getRowModel().rows;
  return (
    <div className={cn(GMAO_TABLE_WRAP, isPending && "opacity-70 transition-opacity")}>
      <div className={GMAO_TABLE_SCROLL}>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id} className="border-0 hover:bg-transparent">
              {hg.headers.map((h) => (
                <TableHead key={h.id} className={GMAO_TABLE_HEAD}>
                  {h.isPlaceholder ? null : <SortableHead header={h} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length ? (
            rows.map((row, i) => {
              const id = getRowId ? getRowId(row.original) : row.id;
              const selected = selectedIdSet?.has(id);
              return (
                <TableRow key={row.id} data-state={selected ? "selected" : undefined} className={gmaoRowClass(i, selected)}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={GMAO_TABLE_CELL}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={Math.max(table.getAllLeafColumns().length, 1)} className="h-28 text-center text-sm text-slate-500">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
