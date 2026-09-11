"use client";

import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { fuzzyMatch } from "@/lib/utils/fuzzy";

export type MachineMultiSelectOption = {
  id: string;
  name: string;
  location: string;
};

type MachineMultiSelectProps = {
  machines: MachineMultiSelectOption[];
  selectedIds: Set<string>;
  onSelectedIdsChange: (ids: Set<string>) => void;
  disabled?: boolean;
  lockedIds?: Set<string>;
  placeholder?: string;
};

export function MachineMultiSelect({
  machines,
  selectedIds,
  onSelectedIdsChange,
  disabled,
  lockedIds,
  placeholder = "Rechercher une machine…",
}: MachineMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selectedMachines = React.useMemo(
    () => machines.filter((m) => selectedIds.has(m.id)),
    [machines, selectedIds],
  );

  const filtered = React.useMemo(() => {
    const needle = query.trim();
    return machines.filter((m) => {
      if (selectedIds.has(m.id)) return false;
      if (!needle) return true;
      const blob = `${m.name} ${m.location}`;
      return fuzzyMatch(needle, blob);
    });
  }, [machines, query, selectedIds]);

  React.useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const addMachine = (id: string) => {
    onSelectedIdsChange(new Set([...Array.from(selectedIds), id]));
    setQuery("");
    inputRef.current?.focus();
  };

  const removeMachine = (id: string) => {
    if (lockedIds?.has(id)) return;
    const next = new Set(selectedIds);
    next.delete(id);
    onSelectedIdsChange(next);
  };

  return (
    <div ref={containerRef} className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="h-10 rounded-lg border-slate-200 bg-white pl-9 pr-9"
          autoComplete="off"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0.5 top-1/2 h-8 w-8 -translate-y-1/2 text-slate-500"
          onClick={() => {
            setOpen((v) => !v);
            inputRef.current?.focus();
          }}
          disabled={disabled}
          aria-label="Ouvrir la liste des machines"
        >
          <ChevronsUpDown className="h-4 w-4" />
        </Button>

        {open && !disabled ? (
          <div className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-slate-500">
                {machines.length === 0 ? "Aucune machine disponible." : "Aucun résultat."}
              </p>
            ) : (
              filtered.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-50"
                  onClick={() => addMachine(m.id)}
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-transparent" aria-hidden />
                  <span>
                    <span className="font-medium text-slate-900">{m.name}</span>
                    <span className="block text-xs text-slate-500">{m.location}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>

      {selectedMachines.length > 0 ? (
        <div className="flex flex-wrap gap-2 rounded-lg border border-slate-100 bg-slate-50/80 p-2.5">
          {selectedMachines.map((m) => {
            const locked = lockedIds?.has(m.id);
            return (
            <Badge
              key={m.id}
              variant="secondary"
              className="gap-1.5 rounded-md border-slate-200 bg-white py-1 pl-2.5 pr-1 text-xs font-medium text-slate-800"
            >
              <span>
                {m.name}
                <span className="ml-1 font-normal text-slate-500">· {m.location}</span>
                {locked ? <span className="ml-1 text-[10px] text-emerald-600">(exécuté)</span> : null}
              </span>
              {!locked ? (
              <button
                type="button"
                onClick={() => removeMachine(m.id)}
                disabled={disabled}
                className="rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label={`Retirer ${m.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
              ) : null}
            </Badge>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-slate-500">Sélectionnez au moins une machine pour cet ordre.</p>
      )}
    </div>
  );
}

type TaskCheckboxProps = {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export function MaintenanceTaskCheckbox({ id, label, hint, checked, onChange, disabled }: TaskCheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer flex-col gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition-colors hover:border-[#1F76FB]/30 hover:bg-[#E8F1FF]/30",
        checked && "border-[#1F76FB]/40 bg-[#E8F1FF]/40",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span className="flex items-center gap-2">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="h-4 w-4 rounded border-slate-300 accent-[#1F76FB]"
        />
        <span className="text-sm font-medium text-slate-800">{label}</span>
      </span>
      {hint ? <span className="pl-6 text-[11px] leading-snug text-slate-500">{hint}</span> : null}
    </label>
  );
}

export function FormFieldLabel({
  icon: Icon,
  htmlFor,
  children,
  required,
}: {
  icon: React.ComponentType<{ className?: string }>;
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <LabelRow htmlFor={htmlFor}>
      <Icon className="h-4 w-4 shrink-0 text-[#1F76FB]" aria-hidden />
      <span>
        {children}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
    </LabelRow>
  );
}

function LabelRow({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}) {
  if (htmlFor) {
    return (
      <label htmlFor={htmlFor} className="flex items-center gap-2 text-sm font-medium text-slate-800">
        {children}
      </label>
    );
  }
  return <div className="flex items-center gap-2 text-sm font-medium text-slate-800">{children}</div>;
}
