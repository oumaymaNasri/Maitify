"use client";

import { FileSpreadsheet, FileText } from "lucide-react";

import type { InterventionListVm } from "@/components/interventions/intervention-types";
import { Button } from "@/components/ui/button";
import { exportInterventionsToExcel, exportInterventionsToPdf } from "@/lib/export/interventions-export";

type InterventionsExportButtonsProps = {
  items: InterventionListVm[];
};

export function InterventionsExportButtons({ items }: InterventionsExportButtonsProps) {
  const disabled = items.length === 0;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() => exportInterventionsToExcel(items)}
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
        onClick={() => exportInterventionsToPdf(items)}
        className="h-9 border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 hover:text-rose-900"
      >
        <FileText className="mr-1.5 h-4 w-4" />
        Exporter PDF
      </Button>
    </>
  );
}
