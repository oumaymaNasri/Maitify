import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MachineHistoryExportButtons } from "@/components/machines/machine-history-export-buttons";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  fetchMachineHistoryExportRows,
  fetchMachineHistoryHeader,
  fetchMachineHistoryPage,
} from "@/lib/gmao/machine-history-query";
import { interventionTypeFr } from "@/lib/view/labels";
import {
  machineAssetStatusFr,
  machineStatusBadgeClass,
  maintenanceWorkflowStatusFr,
} from "@/lib/view/machine-labels";
import { cn } from "@/lib/utils";

type PageProps = {
  params: { id: string };
  searchParams?: { page?: string };
};

function formatHistoryDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

function workflowBadgeClass(status: string): string {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "OPEN":
      return "bg-amber-100 text-amber-800 border-amber-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export default async function MachineHistoryPage({ params, searchParams }: PageProps) {
  const page = Math.max(1, Number.parseInt(searchParams?.page ?? "1", 10) || 1);

  const [header, history, exportRows] = await Promise.all([
    fetchMachineHistoryHeader(params.id),
    fetchMachineHistoryPage(params.id, page),
    fetchMachineHistoryExportRows(params.id),
  ]);

  if (!header || !history || exportRows === null) notFound();

  const pageHref = (targetPage: number) => {
    if (targetPage <= 1) return `/machines/${params.id}/historique`;
    return `/machines/${params.id}/historique?page=${targetPage}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <ButtonLink
              href="/machines"
              variant="outline"
              size="sm"
              className="h-9 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Retour à la liste
            </ButtonLink>
            <span className="font-semibold text-slate-900">{header.name}</span>
            <span className="font-mono text-xs text-slate-600">{header.code}</span>
            <span className="text-sm text-slate-600">{header.location}</span>
            <Badge className={cn("font-medium", machineStatusBadgeClass(header.assetStatus))}>
              {machineAssetStatusFr(header.assetStatus)}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MachineHistoryExportButtons header={header} rows={exportRows} />
          </div>
      </div>

      {history.items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-600">
          Aucune intervention enregistrée pour cet équipement.
        </p>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead className="h-11 bg-[#1F76FB] px-3 text-xs font-semibold uppercase tracking-wide text-white first:rounded-tl-xl">
                    Date
                  </TableHead>
                  <TableHead className="h-11 bg-[#1F76FB] px-3 text-xs font-semibold uppercase tracking-wide text-white">
                    Code/Réf
                  </TableHead>
                  <TableHead className="h-11 bg-[#1F76FB] px-3 text-xs font-semibold uppercase tracking-wide text-white">
                    Type
                  </TableHead>
                  <TableHead className="h-11 bg-[#1F76FB] px-3 text-xs font-semibold uppercase tracking-wide text-white">
                    Technicien
                  </TableHead>
                  <TableHead className="h-11 bg-[#1F76FB] px-3 text-xs font-semibold uppercase tracking-wide text-white">
                    Description
                  </TableHead>
                  <TableHead className="h-11 bg-[#1F76FB] px-3 text-xs font-semibold uppercase tracking-wide text-white last:rounded-tr-xl">
                    Statut
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.items.map((row, index) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "border-slate-100 transition-colors hover:bg-[#E8F1FF]/50",
                      index % 2 === 1 && "bg-slate-50/60",
                    )}
                  >
                    <TableCell className="whitespace-nowrap px-3 py-3 text-sm text-slate-700">
                      {formatHistoryDate(row.date)}
                    </TableCell>
                    <TableCell className="px-3 py-3 font-mono text-xs text-slate-600">{row.referenceCode}</TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-700">{interventionTypeFr(row.type)}</TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-700">{row.technicianName ?? "—"}</TableCell>
                    <TableCell className="max-w-md px-3 py-3 text-sm text-slate-700">
                      <span className="line-clamp-2" title={row.description}>
                        {row.description}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <Badge className={cn("font-medium", workflowBadgeClass(row.workflowStatus))}>
                        {maintenanceWorkflowStatusFr(row.workflowStatus)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-slate-600">
              <span className="font-semibold tabular-nums text-slate-900">{history.total}</span> intervention
              {history.total > 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              {history.page > 1 ? (
                <Link
                  href={pageHref(history.page - 1)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  aria-label="Page précédente"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Link>
              ) : (
                <span className="inline-flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-300">
                  <ChevronLeft className="h-4 w-4" />
                </span>
              )}
              <span className="text-sm tabular-nums text-slate-600">
                Page {history.page} / {history.pageCount}
              </span>
              {history.page < history.pageCount ? (
                <Link
                  href={pageHref(history.page + 1)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  aria-label="Page suivante"
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <span className="inline-flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-300">
                  <ChevronRight className="h-4 w-4" />
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
