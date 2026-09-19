"use client";

import { Search } from "lucide-react";
import * as React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { cn } from "@/lib/utils";

export type ModuleFilterConfig = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
};

type IsolatedModuleSearchProps = {
  placeholder: string;
  resetKey?: string | number;
  onDebouncedChange: (value: string) => void;
  onFilteringChange?: (isFiltering: boolean) => void;
  compact?: boolean;
};

const IsolatedModuleSearch = React.memo(function IsolatedModuleSearch({
  placeholder,
  resetKey,
  onDebouncedChange,
  onFilteringChange,
  compact = false,
}: IsolatedModuleSearchProps) {
  const [localQ, setLocalQ] = React.useState("");
  const debouncedQ = useDebouncedValue(localQ, 150);

  React.useEffect(() => {
    setLocalQ("");
  }, [resetKey]);

  React.useEffect(() => {
    onDebouncedChange(debouncedQ);
  }, [debouncedQ, onDebouncedChange]);

  React.useEffect(() => {
    onFilteringChange?.(localQ !== debouncedQ);
  }, [localQ, debouncedQ, onFilteringChange]);

  return (
    <div
      className={cn(
        compact
          ? "min-w-[14rem] flex-[1.8] shrink-0"
          : "space-y-1.5 sm:col-span-2 lg:col-span-5",
      )}
    >
      <Label htmlFor="module-search" className={cn("font-medium text-slate-700", compact ? "text-[11px]" : "text-xs")}>
        Recherche
      </Label>
      <div className={cn("relative", compact && "mt-0.5")}>
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <Input
          id="module-search"
          value={localQ}
          onChange={(e) => setLocalQ(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "border-slate-200 bg-white pl-8 text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#1F76FB]",
            compact ? "h-9 text-sm" : "h-10",
          )}
        />
      </div>
    </div>
  );
});

type ModuleFilterBarProps = {
  onDebouncedSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  searchResetKey?: string | number;
  filters: ModuleFilterConfig[];
  resultCount?: number;
  action?: React.ReactNode;
  exportActions?: React.ReactNode;
  extras?: React.ReactNode;
  layout?: "grid" | "inline";
  className?: string;
};

function ModuleFilterBarInner({
  onDebouncedSearchChange,
  searchPlaceholder = "Recherche par nom ou ID…",
  searchResetKey,
  filters,
  resultCount,
  action,
  exportActions,
  extras,
  layout = "grid",
  className,
}: ModuleFilterBarProps) {
  const [isFiltering, setIsFiltering] = React.useState(false);
  const handleDebouncedChange = React.useCallback(
    (value: string) => {
      onDebouncedSearchChange(value);
    },
    [onDebouncedSearchChange],
  );
  const inline = layout === "inline";

  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 bg-white shadow-sm transition-all duration-300",
        inline ? "px-3 py-2" : "p-4",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-2",
          inline ? "mb-2" : "mb-4 flex-col sm:flex-row",
        )}
      >
        <div className="flex min-w-0 items-center gap-2 text-xs text-slate-600 sm:text-sm">
          {resultCount != null ? (
            <>
              <span className="font-semibold tabular-nums text-slate-900">{resultCount}</span>
              résultat(s)
            </>
          ) : null}
          {isFiltering ? <span className="text-xs text-[#1F76FB]">Filtrage…</span> : null}
        </div>
        <div className="flex shrink-0 flex-nowrap items-center gap-2">
          {exportActions}
          {action}
        </div>
      </div>

      {inline ? (
        <div className="flex flex-nowrap items-end gap-2 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
          <IsolatedModuleSearch
            placeholder={searchPlaceholder}
            resetKey={searchResetKey}
            onDebouncedChange={handleDebouncedChange}
            onFilteringChange={setIsFiltering}
            compact
          />
          {filters.map((f) => (
            <div key={f.id} className="min-w-[8.5rem] flex-1 shrink-0">
              <Label className="text-[11px] font-medium text-slate-700">{f.label}</Label>
              <Select value={f.value} onValueChange={f.onChange}>
                <SelectTrigger className="mt-0.5 h-9 border-slate-200 bg-white text-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {f.options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          {extras}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
          <IsolatedModuleSearch
            placeholder={searchPlaceholder}
            resetKey={searchResetKey}
            onDebouncedChange={handleDebouncedChange}
            onFilteringChange={setIsFiltering}
          />
          {filters.map((f) => (
            <div key={f.id} className="space-y-1.5 lg:col-span-2">
              <Label className="text-xs font-medium text-slate-700">{f.label}</Label>
              <Select value={f.value} onValueChange={f.onChange}>
                <SelectTrigger className="h-10 border-slate-200 bg-white text-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {f.options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          {extras}
        </div>
      )}
    </div>
  );
}

export const ModuleFilterBar = React.memo(ModuleFilterBarInner);
