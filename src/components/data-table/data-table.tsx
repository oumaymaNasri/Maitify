"use client";

import type { ColumnDef, FilterFn, SortingState } from "@tanstack/react-table";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import * as React from "react";

import { GmaoStandardTable, GmaoTablePagination } from "@/components/gmao/gmao-table";
import { ModuleFilterBar } from "@/components/gmao/premium/module-filter-bar";
import { GMAO_TABLE_PAGE_SIZE } from "@/components/gmao/table-styles";

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  filterPlaceholder?: string;
  globalFilterFn?: FilterFn<TData>;
};

export function DataTable<TData, TValue>({
  columns,
  data,
  filterPlaceholder = "Recherche par nom ou ID…",
  globalFilterFn: customGlobalFilterFn,
}: DataTableProps<TData, TValue>) {
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    globalFilterFn:
      customGlobalFilterFn ??
      ((row, _columnId, filterValue) => {
        if (!filterValue) return true;
        return JSON.stringify(row.original).toLowerCase().includes(String(filterValue).toLowerCase());
      }),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: GMAO_TABLE_PAGE_SIZE },
    },
  });

  const filteredCount = table.getFilteredRowModel().rows.length;

  return (
    <div className="space-y-3">
      <ModuleFilterBar
        layout="inline"
        onDebouncedSearchChange={setGlobalFilter}
        searchPlaceholder={filterPlaceholder}
        filters={[]}
        resultCount={filteredCount}
      />
      <GmaoStandardTable table={table} emptyMessage="Aucun enregistrement." />
      <GmaoTablePagination
        total={filteredCount}
        noun="résultat(s)"
        page={table.getState().pagination.pageIndex + 1}
        pageCount={Math.max(table.getPageCount(), 1)}
        canPrevious={table.getCanPreviousPage()}
        canNext={table.getCanNextPage()}
        onPrevious={() => table.previousPage()}
        onNext={() => table.nextPage()}
      />
    </div>
  );
}
