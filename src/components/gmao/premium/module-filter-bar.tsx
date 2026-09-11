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
};

const IsolatedModuleSearch = React.memo(function IsolatedModuleSearch({
  placeholder,
  resetKey,
  onDebouncedChange,
  onFilteringChange,
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
    <div className="space-y-1.5 sm:col-span-2 lg:col-span-5">
      <Label htmlFor="module-search" className="text-xs font-medium text-slate-700">
        Recherche
      </Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          id="module-search"
          value={localQ}
          onChange={(e) => setLocalQ(e.target.value)}
          placeholder={placeholder}
          className="h-10 border-slate-200 bg-white pl-9 text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#1F76FB]"
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
  className,
}: ModuleFilterBarProps) {
  const [isFiltering, setIsFiltering] = React.useState(false);
  const handleDebouncedChange = React.useCallback(
    (value: string) => {
      onDebouncedSearchChange(value);
    },
    [onDebouncedSearchChange],
  );

  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300",
        className,
      )}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          {resultCount != null ? (
            <>
              <span className="font-semibold tabular-nums text-slate-900">{resultCount}</span>
              résultat(s)
            </>
          ) : null}
          {isFiltering ? <span className="text-xs text-[#1F76FB]">Filtrage…</span> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {exportActions}
          {action}
        </div>
      </div>

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
      </div>
    </div>
  );
}

export const ModuleFilterBar = React.memo(ModuleFilterBarInner);
