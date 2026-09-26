"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type VirtualSelectOption = {
  value: string;
  label: string;
  description?: string;
};

type SearchableVirtualSelectProps = {
  id?: string;
  name?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: VirtualSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
};

function SearchableVirtualSelectInner({
  id,
  name,
  value,
  onValueChange,
  options,
  placeholder = "Rechercher…",
  disabled,
  required,
}: SearchableVirtualSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const selected = React.useMemo(() => options.find((o) => o.value === value) ?? null, [options, value]);

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(needle) ||
        (o.description?.toLowerCase().includes(needle) ?? false),
    );
  }, [options, query]);

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 44,
    overscan: 12,
    enabled: open,
  });

  React.useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  React.useEffect(() => {
    if (!open) setQuery(selected?.label ?? "");
  }, [open, selected]);

  return (
    <div ref={containerRef} className="relative">
      {name ? <input type="hidden" name={name} value={value} required={required} /> : null}
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
      <Input
        id={id}
        value={open ? query : selected?.label ?? query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className="h-10 rounded-lg border-slate-200 bg-white pl-9 pr-9"
      />
      <ChevronsUpDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      {open && !disabled ? (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-500">Aucun résultat.</p>
          ) : (
            <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
              {virtualizer.getVirtualItems().map((item) => {
                const option = filtered[item.index]!;
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      "absolute left-0 flex w-full items-center justify-between gap-2 px-3 py-1 text-left text-sm hover:bg-slate-50",
                      isSelected && "bg-[#E8F1FF]/60",
                    )}
                    style={{ height: item.size, transform: `translateY(${item.start}px)` }}
                    onClick={() => {
                      onValueChange(option.value);
                      setOpen(false);
                    }}
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{option.label}</span>
                      {option.description ? (
                        <span className="block truncate text-[11px] text-slate-500">{option.description}</span>
                      ) : null}
                    </span>
                    {isSelected ? <Check className="h-4 w-4 shrink-0 text-[#1F76FB]" /> : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export const SearchableVirtualSelect = React.memo(SearchableVirtualSelectInner);
