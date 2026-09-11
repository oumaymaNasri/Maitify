"use client";

import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { StockMovementRow } from "@/lib/gmao/stock-movements-query";
import { cn } from "@/lib/utils";

type StockMovementsTableProps = {
  movements: StockMovementRow[];
  isPending?: boolean;
};

export function StockMovementsTable({ movements, isPending }: StockMovementsTableProps) {
  if (movements.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
        <p className="font-medium text-slate-700">Aucun mouvement enregistré</p>
        <p className="mt-1 text-sm text-slate-500">
          Les entrées et sorties manuelles ou liées aux interventions apparaîtront ici.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm",
        isPending && "opacity-60",
      )}
    >
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 hover:bg-slate-50">
            <TableHead>Date</TableHead>
            <TableHead>Pièce</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Quantité</TableHead>
            <TableHead>Motif</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.map((m) => {
            const isEntree = m.type === "ENTREE";
            return (
              <TableRow key={m.id}>
                <TableCell className="whitespace-nowrap text-sm tabular-nums text-slate-600">
                  {new Date(m.date).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-slate-900">{m.partDesignation}</p>
                    <p className="text-xs text-slate-500">
                      {[m.partBrand, m.partReference].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      "gap-1 border-0",
                      isEntree
                        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                        : "bg-amber-100 text-amber-800 hover:bg-amber-100",
                    )}
                  >
                    {isEntree ? (
                      <ArrowDownLeft className="h-3 w-3" aria-hidden />
                    ) : (
                      <ArrowUpRight className="h-3 w-3" aria-hidden />
                    )}
                    {isEntree ? "Entrée" : "Sortie"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono font-semibold tabular-nums">
                  {isEntree ? "+" : "−"}
                  {m.quantity}
                </TableCell>
                <TableCell className="max-w-xs truncate text-sm text-slate-600">{m.motif ?? "—"}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
