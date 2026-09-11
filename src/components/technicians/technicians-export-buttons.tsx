"use client";

import { FileSpreadsheet, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { TechnicianRow } from "@/lib/gmao/technicians-query";
import { exportTechniciansToExcel, exportTechniciansToPdf } from "@/lib/export/technicians-export";

export function TechniciansExportButtons({ technicians }: { technicians: TechnicianRow[] }) {
  const disabled = technicians.length === 0;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() => exportTechniciansToExcel(technicians)}
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
        onClick={() => exportTechniciansToPdf(technicians)}
        className="h-9 border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 hover:text-rose-900"
      >
        <FileText className="mr-1.5 h-4 w-4" />
        Exporter PDF
      </Button>
    </>
  );
}
