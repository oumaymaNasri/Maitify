"use client";

import { FileSpreadsheet, FileText } from "lucide-react";

import type { MachineHistoryHeader, MachineHistoryRow } from "@/lib/gmao/machine-history-query";
import { Button } from "@/components/ui/button";
import {
  exportMachineHistoryToExcel,
  exportMachineHistoryToPdf,
  sanitizeMachineExportFilename,
} from "@/lib/export/machine-history-export";

export function MachineHistoryExportButtons({
  header,
  rows,
}: {
  header: MachineHistoryHeader;
  rows: MachineHistoryRow[];
}) {
  const disabled = rows.length === 0;
  const filename = `historique_${sanitizeMachineExportFilename(header.name)}.csv`;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() => exportMachineHistoryToExcel(rows, filename)}
        className="h-9 border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900"
      >
        <FileSpreadsheet className="mr-1.5 h-4 w-4" />
        Exporter Excel
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() => exportMachineHistoryToPdf(header, rows)}
        className="h-9 border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 hover:text-rose-900"
      >
        <FileText className="mr-1.5 h-4 w-4" />
        Exporter PDF
      </Button>
    </>
  );
}
