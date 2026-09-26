"use client";

import * as React from "react";

import { setPreventiveRealizedAction } from "@/app/actions/maintenance-log";
import { cn } from "@/lib/utils";

export function PreventiveRealizedCheckboxes({
  id,
  realized,
  disabled,
  onUpdated,
}: {
  id: string;
  realized: boolean | null;
  disabled?: boolean;
  onUpdated: (id: string, realized: boolean | null) => void;
}) {
  const [pending, setPending] = React.useState(false);

  const setValue = async (next: boolean | null) => {
    if (disabled || pending) return;
    const previous = realized;
    onUpdated(id, next);
    setPending(true);
    const res = await setPreventiveRealizedAction(id, next);
    setPending(false);
    if (!res.ok) {
      onUpdated(id, previous);
      window.alert(res.error);
    }
  };

  return (
    <div className={cn("flex flex-col gap-0.5 text-[11px] text-slate-700", pending && "opacity-60")} onClick={(e) => e.stopPropagation()}>
      <label className="inline-flex items-center gap-1.5">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
          checked={realized === true}
          disabled={disabled || pending}
          onChange={() => void setValue(realized === true ? null : true)}
          aria-label="Marquer comme réalisée"
        />
        Réalisée
      </label>
      <label className="inline-flex items-center gap-1.5">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 rounded border-slate-300 text-rose-600 focus:ring-rose-600"
          checked={realized === false}
          disabled={disabled || pending}
          onChange={() => void setValue(realized === false ? null : false)}
          aria-label="Marquer comme non réalisée"
        />
        Non réalisée
      </label>
    </div>
  );
}
