"use client";

import { FileSpreadsheet, FileText } from "lucide-react";

import type { MachineCardVm } from "@/components/machines/machine-card";
import { Button } from "@/components/ui/button";
import { exportMachinesToExcel, exportMachinesToPdf } from "@/lib/export/machines-export";

export function MachinesExportButtons({ machines }: { machines: MachineCardVm[] }) {
  const disabled = machines.length === 0;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() => exportMachinesToExcel(machines)}
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
        onClick={() => exportMachinesToPdf(machines)}
        className="h-9 border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 hover:text-rose-900"
      >
        <FileText className="mr-1.5 h-4 w-4" />
        Exporter PDF
      </Button>
    </>
  );
}
