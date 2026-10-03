"use client";

import { Package } from "lucide-react";

import type { AssignedPartVm } from "@/lib/gmao/assigned-parts";
import { cn } from "@/lib/utils";

export function AssignedPartsList({
  parts,
  compact = false,
  emptyLabel = "Aucune pièce de rechange affectée.",
}: {
  parts: AssignedPartVm[];
  compact?: boolean;
  emptyLabel?: string;
}) {
  if (parts.length === 0) {
    return <p className={cn("text-xs text-slate-500", !compact && "text-sm")}>{emptyLabel}</p>;
  }

  return (
    <ul className={cn("space-y-1.5", compact && "space-y-1")}>
      {parts.map((part) => {
        const low = part.quantity <= part.minStock;
        return (
          <li
            key={part.id}
            className={cn(
              "flex items-start justify-between gap-2 rounded-md border border-slate-200 bg-white",
              compact ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm",
            )}
          >
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 font-medium text-slate-800">
                <Package className="h-3.5 w-3.5 shrink-0 text-[#1F76FB]" aria-hidden />
                <span className="truncate">{part.designation}</span>
              </span>
              {part.reference ? <span className="mt-0.5 block truncate pl-5 text-[11px] text-slate-500">{part.reference}</span> : null}
            </span>
            <span className={cn("shrink-0 tabular-nums font-semibold", low ? "text-rose-700" : "text-emerald-700")}>
              {part.quantity}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
