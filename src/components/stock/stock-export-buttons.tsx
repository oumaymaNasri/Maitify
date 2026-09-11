"use client";

import { FileSpreadsheet, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { StockMovementRow } from "@/lib/gmao/stock-movements-query";
import type { PartInventoryRow } from "@/lib/gmao/stock-parts-query";
import {
  exportInventoryToExcel,
  exportInventoryToPdf,
  exportMovementsToExcel,
  exportMovementsToPdf,
} from "@/lib/export/stock-export";

type StockExportButtonsProps = {
  activeTab: "inventory" | "movements";
  inventory: PartInventoryRow[];
  movements: StockMovementRow[];
};

export function StockExportButtons({ activeTab, inventory, movements }: StockExportButtonsProps) {
  const items = activeTab === "inventory" ? inventory : movements;
  const disabled = items.length === 0;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() =>
          activeTab === "inventory" ? exportInventoryToExcel(inventory) : exportMovementsToExcel(movements)
        }
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
        onClick={() =>
          activeTab === "inventory" ? exportInventoryToPdf(inventory) : exportMovementsToPdf(movements)
        }
        className="h-9 border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 hover:text-rose-900"
      >
        <FileText className="mr-1.5 h-4 w-4" />
        Exporter PDF
      </Button>
    </>
  );
}
