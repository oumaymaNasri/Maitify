"use client";

import { Check, ChevronsUpDown, Search } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { fuzzyMatch } from "@/lib/utils/fuzzy";

export type SparePartSelectOption = {
  id: string;
  designation: string;
  reference: string | null;
  quantity: number;
  minStock: number;
};

type SparePartSearchSelectProps = {
  parts: SparePartSelectOption[];
  value: string;
  onValueChange: (id: string) => void;
  excludeIds?: Set<string>;
  disabled?: boolean;
  placeholder?: string;
};

export function SparePartSearchSelect({
  parts,
  value,
  onValueChange,
  excludeIds,
  disabled,
  placeholder = "Rechercher une pièce du stock…",
}: SparePartSearchSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selected = React.useMemo(() => parts.find((p) => p.id === value) ?? null, [parts, value]);

  const filtered = React.useMemo(() => {
    const needle = query.trim();
    return parts.filter((p) => {
      if (excludeIds?.has(p.id) && p.id !== value) return false;
      if (!needle) return true;
      const blob = `${p.designation} ${p.reference ?? ""}`;
      return fuzzyMatch(needle, blob);
    });
  }, [parts, query, excludeIds, value]);

  React.useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  React.useEffect(() => {
    if (selected) {
      setQuery(`${selected.designation}${selected.reference ? ` (${selected.reference})` : ""}`);
    } else if (!open) {
      setQuery("");
    }
  }, [selected, open]);

  const pickPart = (id: string) => {
    onValueChange(id);
    setOpen(false);
  };

  const clearSelection = () => {
    onValueChange("");
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (value) onValueChange("");
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        className="h-10 rounded-lg border-slate-200 bg-white pl-9 pr-16"
        autoComplete="off"
      />
      <div className="absolute right-0.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-slate-500"
            onClick={clearSelection}
            disabled={disabled}
          >
            Effacer
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-500"
          onClick={() => {
            setOpen((v) => !v);
            inputRef.current?.focus();
          }}
          disabled={disabled}
          aria-label="Ouvrir la liste des pièces"
        >
          <ChevronsUpDown className="h-4 w-4" />
        </Button>
      </div>

      {open && !disabled ? (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-500">
              {parts.length === 0 ? "Aucune pièce en stock." : "Aucun résultat."}
            </p>
          ) : (
            filtered.map((p) => {
              const lowStock = p.quantity <= p.minStock;
              const isSelected = p.id === value;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={cn(
                    "flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-50",
                    isSelected && "bg-[#E8F1FF]/60",
                  )}
                  onClick={() => pickPart(p.id)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{p.designation}</p>
                    <p className="text-xs text-slate-500">{p.reference ?? "Sans référence"}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={cn("text-sm font-semibold tabular-nums", lowStock ? "text-rose-600" : "text-slate-800")}>
                      {p.quantity}
                    </span>
                    {lowStock ? (
                      <Badge className="border border-rose-300 bg-rose-600 px-1.5 py-0 text-[10px] text-white hover:bg-rose-600">
                        Alerte
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-slate-400">seuil {p.minStock}</span>
                    )}
                    {isSelected ? <Check className="h-4 w-4 text-[#1F76FB]" aria-hidden /> : null}
                  </div>
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
