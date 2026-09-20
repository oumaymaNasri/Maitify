import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { DbErrorHint } from "@/components/layout/DbError";
import { MachineHistoryExportButtons } from "@/components/machines/machine-history-export-buttons";
import { MachineHistoryTable } from "@/components/machines/machine-history-table";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import {
  fetchMachineHistoryExportRows,
  fetchMachineHistoryHeader,
  fetchMachineHistoryPage,
} from "@/lib/gmao/machine-history-query";
import { parsePageSize } from "@/lib/db/pagination";
import { machineAssetStatusFr, machineStatusBadgeClass } from "@/lib/view/machine-labels";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type RouteParams = { id: string };
type RouteSearch = { page?: string; pageSize?: string };

type PageProps = {
  params: RouteParams | Promise<RouteParams>;
  searchParams?: RouteSearch | Promise<RouteSearch>;
};

function isNextControlFlowError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("digest" in error)) return false;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && (digest === "NEXT_NOT_FOUND" || digest.startsWith("NEXT_REDIRECT"));
}

async function MachineHistoryContent({
  machineId,
  page,
  pageSize,
}: {
  machineId: string;
  page: number;
  pageSize: number;
}) {
  try {
    if (!machineId) notFound();

    const header = await fetchMachineHistoryHeader(machineId);
    if (!header) notFound();

    const [history, exportRows] = await Promise.all([
      fetchMachineHistoryPage(machineId, page, pageSize),
      fetchMachineHistoryExportRows(machineId).catch(() => []),
    ]);

    if (!history) notFound();

    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <ButtonLink
              href="/donnees-de-base/machines"
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
            <MachineHistoryExportButtons header={header} rows={exportRows ?? []} />
          </div>
        </div>

        <MachineHistoryTable
          machineId={machineId}
          items={history.items}
          total={history.total}
          page={history.page}
          pageCount={history.pageCount}
          pageSize={history.pageSize}
        />
      </div>
    );
  } catch (e) {
    if (isNextControlFlowError(e)) throw e;
    return <DbErrorHint detail={e instanceof Error ? e.message : String(e)} />;
  }
}

export default async function MachineHistoryPage({ params, searchParams }: PageProps) {
  const { id } = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams ?? {});
  const machineId = id?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const pageSize = parsePageSize(query.pageSize);

  return (
    <Suspense fallback={<p className="text-sm text-slate-600">Chargement de l’historique…</p>}>
      <MachineHistoryContent machineId={machineId} page={page} pageSize={pageSize} />
    </Suspense>
  );
}
