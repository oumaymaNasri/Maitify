"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSession } from "@/components/providers/session-provider";
import { cn } from "@/lib/utils";

const MODULES = [
  { href: "/machines", label: "Parc" },
  { href: "/interventions", label: "Activité" },
  { href: "/stock", label: "Stocks" },
  { href: "/maintenance-orders", label: "Planning" },
  { href: "/dashboard", label: "Indicateurs" },
  { href: "/technicians", label: "Administration" },
] as const;

const TECH_HIDDEN = new Set(["/stock", "/technicians"]);

export function GmaoPortalHeader() {
  const pathname = usePathname();
  const { isManager } = useSession();
  const items = isManager ? MODULES : MODULES.filter((m) => !TECH_HIDDEN.has(m.href));

  return (
    <header className="bg-[#0B2A5B] text-white shadow-md">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-8">
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
        </nav>
      </div>
    </header>
  );
}
