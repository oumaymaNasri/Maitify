"use client";

import { Check, ChevronsUpDown, Search } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

export type MachineOption = { id: string; name: string; legacyMatricule?: number | null };

function normalize(v: string) {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Sélecteur de machine avec recherche (nom, matricule M###). */
export function MachineCombobox({
  id,
  machines,
  value,
  onChange,
  disabled,
  invalid,
}: {
  id?: string;
  machines: MachineOption[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const selected = machines.find((m) => m.id === value);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const filtered = React.useMemo(() => {
    const q = normalize(query.trim());
    const list = q
      ? machines.filter((m) =>
          normalize(`${m.name} ${m.legacyMatricule != null ? `m${m.legacyMatricule}` : ""}`).includes(q),
        )
      : machines;
    return list.slice(0, 80);
  }, [machines, query]);

  return (
    <div ref={rootRef} className="relative mt-1">
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen((o) => !o);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={cn(
          "flex w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-left text-sm",
          invalid ? "border-rose-300" : "border-slate-200",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <span className={cn("truncate", !selected && "text-slate-400")}>
          {selected
            ? `${selected.legacyMatricule != null ? `M${selected.legacyMatricule} · ` : ""}${selected.name}`
            : "Rechercher une machine du parc…"}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>
      {open ? (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (filtered[0]) {
                    onChange(filtered[0].id);
                    setOpen(false);
                  }
                }
              }}
              placeholder="Nom ou matricule…"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <ul className="max-h-60 overflow-auto py-1" role="listbox">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-500">Aucune machine trouvée.</li>
            ) : (
              filtered.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={m.id === value}
                    onClick={() => {
                      onChange(m.id);
                      setOpen(false);
                      setQuery("");
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-50"
                  >
                    <Check className={cn("h-3.5 w-3.5", m.id === value ? "text-[#1F76FB]" : "invisible")} />
                    {m.legacyMatricule != null ? (
                      <span className="font-mono text-xs text-slate-500">M{m.legacyMatricule}</span>
                    ) : null}
                    <span className="truncate">{m.name}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
