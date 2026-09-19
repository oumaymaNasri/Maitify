"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { ServerPaginatedTable } from "@/components/data-table/server-paginated-table";
import { Badge } from "@/components/ui/badge";
import type { WaterMeasurementRow } from "@/lib/gmao/water-measurements-query";
import { formatDateFrShort } from "@/lib/utils/format-date";
import { waterZoneFr } from "@/lib/view/labels";

function fmt(v: number | null | undefined): string {
  if (v == null) return "—";
  return String(v);
}

const cols: ColumnDef<WaterMeasurementRow>[] = [
  {
    accessorKey: "zone",
    header: "Zone",
    cell: ({ row }) => (
      <Badge variant="outline" className="font-normal">
        {waterZoneFr(row.original.zone)}
      </Badge>
    ),
  },
  {
    accessorKey: "measuredAt",
    header: "Date",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-sm">
        {formatDateFrShort(row.original.measuredAt)}
      </span>
    ),
  },
  { accessorKey: "ph", header: "pH", cell: ({ row }) => <span className="tabular-nums">{fmt(row.original.ph)}</span> },
  { accessorKey: "th", header: "TH", cell: ({ row }) => <span className="tabular-nums">{fmt(row.original.th)}</span> },
  {
    accessorKey: "conductivity",
    header: "Cond.",
    cell: ({ row }) => <span className="tabular-nums">{fmt(row.original.conductivity)}</span>,
  },
  { accessorKey: "ta", header: "TA", cell: ({ row }) => <span className="tabular-nums">{fmt(row.original.ta)}</span> },
  { accessorKey: "tac", header: "TAC", cell: ({ row }) => <span className="tabular-nums">{fmt(row.original.tac)}</span> },
  { accessorKey: "cl", header: "Cl", cell: ({ row }) => <span className="tabular-nums">{fmt(row.original.cl)}</span> },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => (
      <p className="max-w-[180px] truncate text-xs text-muted-foreground" title={row.original.notes ?? ""}>
        {row.original.notes ?? "—"}
      </p>
    ),
  },
];

type WaterMeasurementsDataTableProps = {
  rows: WaterMeasurementRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  query: string;
};

export function WaterMeasurementsDataTable({
  rows,
  total,
  page,
  pageSize,
  pageCount,
  query,
}: WaterMeasurementsDataTableProps) {
  return (
    <ServerPaginatedTable
      columns={cols}
      data={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      pageCount={pageCount}
      initialQuery={query}
      filterPlaceholder="Rechercher dans les notes…"
    />
  );
}
