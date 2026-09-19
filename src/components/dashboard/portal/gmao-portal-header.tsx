"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSession } from "@/components/providers/session-provider";
import { cn } from "@/lib/utils";

const MODULES = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/machines", label: "Parc" },
  { href: "/interventions", label: "Activité" },
  { href: "/stock", label: "Stocks" },
  { href: "/maintenance-orders", label: "Planning" },
  { href: "/technicians", label: "Administration" },
] as const;

const TECH_HIDDEN = new Set(["/stock", "/technicians"]);

export function GmaoPortalHeader() {
  const pathname = usePathname();
  const { isManager } = useSession();
  const items = isManager ? MODULES : MODULES.filter((m) => !TECH_HIDDEN.has(m.href));

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0B2A5B] text-white shadow-md">
      <div className="flex w-full flex-wrap items-center gap-3 px-4 py-3 md:px-8">
        <Link href="/dashboard" className="mr-2 shrink-0 leading-none">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-300">NutriFish</span>
          <span className="text-xl font-bold tracking-tight md:text-2xl">
            GMAO<span className="font-semibold text-sky-300"> Pro</span>
          </span>
        </Link>
        <nav className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1 md:gap-2">
          {items.map((item) => {
            const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide md:px-3 md:text-xs",
                  active ? "bg-white/15 text-white" : "text-sky-100/80 hover:bg-white/10 hover:text-white",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/interventions/new"
            className="ml-1 inline-flex items-center gap-1 rounded-md bg-[#1F76FB] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white hover:bg-[#1865D9] md:text-xs"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Intervention
          </Link>
        </nav>
      </div>
    </header>
  );
}
