"use client";

import * as React from "react";

import { GmaoBulkSelectBar, GmaoTablePagination } from "@/components/gmao/gmao-table";

type CatalogCardsGridProps = {
  children: React.ReactNode;
  emptyMessage: string;
  isEmpty: boolean;
  selectedCount: number;
  onBulkDelete?: () => void;
  pagination?: {
    total: number;
    noun: string;
    page?: number;
    pageCount?: number;
    pageSize?: number;
    previousHref?: string;
    nextHref?: string;
  };
};

export function CatalogCardsGrid({
  children,
  emptyMessage,
  isEmpty,
  selectedCount,
  onBulkDelete,
  pagination,
}: CatalogCardsGridProps) {
  if (isEmpty) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-600">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {onBulkDelete ? <GmaoBulkSelectBar count={selectedCount} onBulkDelete={onBulkDelete} /> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
      {pagination ? (
        <GmaoTablePagination
          total={pagination.total}
          noun={pagination.noun}
          page={pagination.page}
          pageCount={pagination.pageCount}
          pageSize={pagination.pageSize}
          previousHref={pagination.previousHref}
          nextHref={pagination.nextHref}
        />
      ) : null}
    </div>
  );
}
