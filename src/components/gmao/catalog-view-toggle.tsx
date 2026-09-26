"use client";

import { LayoutGrid, LayoutList } from "lucide-react";

import type { CatalogViewMode } from "@/lib/hooks/use-catalog-view-mode";
import { cn } from "@/lib/utils";

export function CatalogViewToggle({
  value,
  onChange,
}: {
  value: CatalogViewMode;
  onChange: (mode: CatalogViewMode) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Mode d'affichage"
      className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5"
    >
      <button
        type="button"
        aria-pressed={value === "list"}
        onClick={() => onChange("list")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-xs font-semibold transition",
          value === "list" ? "bg-white text-[#0B2A5B] shadow-sm" : "text-slate-500 hover:text-slate-800",
        )}
      >
        <LayoutList className="h-3.5 w-3.5" />
        Vue Liste
      </button>
      <button
        type="button"
        aria-pressed={value === "cards"}
        onClick={() => onChange("cards")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-xs font-semibold transition",
          value === "cards" ? "bg-white text-[#0B2A5B] shadow-sm" : "text-slate-500 hover:text-slate-800",
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Vue Cartes
      </button>
    </div>
  );
}
