"use client";

import { ChevronDown } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

export function InterventionsCollapseSection({
  id,
  title,
  count,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <h2 className="m-0">
        <button
          type="button"
          id={`${id}-trigger`}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
        >
          <span className="text-base font-semibold text-slate-900">
            {title}{" "}
            <span className="font-semibold tabular-nums text-[#1F76FB]">
              ({count.toLocaleString("fr-FR")})
            </span>
          </span>
          <ChevronDown className={cn("h-5 w-5 shrink-0 text-slate-500 transition-transform", open && "rotate-180")} />
        </button>
      </h2>
      {open ? (
        <div id={`${id}-panel`} role="region" aria-labelledby={`${id}-trigger`} className="border-t border-slate-100 p-3">
          {children}
        </div>
      ) : null}
    </section>
  );
}
