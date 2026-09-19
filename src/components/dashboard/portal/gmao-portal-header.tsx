"use client";

import { Plus, Settings } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggleButton } from "@/components/layout/ThemeToggleButton";
import { UserProfileMenu } from "@/components/layout/UserProfileMenu";
import { useSession } from "@/components/providers/session-provider";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const GlobalSearch = dynamic(
  () => import("@/components/layout/GlobalSearch").then((m) => ({ default: m.GlobalSearch })),
  { ssr: false, loading: () => <div className="h-9 min-w-0 flex-1 md:h-10" /> },
);

const MODULES = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/machines", label: "Liste des Machines" },
  { href: "/technicians", label: "Liste des Techniciens" },
  { href: "/maintenance-orders", label: "Ordre de maintenance" },
  { href: "/interventions", label: "Liste de Maintenance" },
  { href: "/stock", label: "Stock & Pièces" },
] as const;

const TECH_HIDDEN = new Set(["/stock", "/technicians"]);

export function GmaoPortalHeader() {
  const pathname = usePathname();
  const { isManager } = useSession();
  const items = isManager ? MODULES : MODULES.filter((m) => !TECH_HIDDEN.has(m.href));

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0B2A5B] text-white shadow-md">
      <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 md:px-8">
        <Link href="/dashboard" className="mr-1 shrink-0 leading-none">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-300">NutriFish</span>
          <span className="text-xl font-bold tracking-tight md:text-2xl">
            GMAO<span className="font-semibold text-sky-300"> Pro</span>
          </span>
        </Link>

        <nav className="flex min-w-0 flex-wrap items-center gap-1 md:gap-1.5">
          {items.map((item) => {
            const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-2 py-1.5 text-[11px] font-semibold tracking-wide md:px-2.5 md:text-xs",
                  active ? "bg-white/15 text-white" : "text-sky-100/80 hover:bg-white/10 hover:text-white",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="order-last flex min-w-[12rem] flex-1 basis-full items-center sm:order-none sm:basis-0 sm:px-2">
          <GlobalSearch tone="onDark" className="w-full min-w-0" />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <ThemeToggleButton className="h-9 w-9 text-sky-100 hover:bg-white/10 hover:text-white" />
          {isManager ? (
            <Link
              href="/maintenance-orders"
              aria-label="Configuration GMAO"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "hidden h-9 w-9 text-sky-100 hover:bg-white/10 hover:text-white sm:inline-flex",
              )}
            >
              <Settings className="h-4 w-4" />
            </Link>
          ) : null}
          <Link
            href="/interventions/new"
            className="hidden items-center gap-1 rounded-md bg-[#1F76FB] px-3 py-1.5 text-[11px] font-semibold tracking-wide text-white hover:bg-[#1865D9] sm:inline-flex md:text-xs"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Intervention
          </Link>
          <UserProfileMenu tone="onDark" />
        </div>
      </div>
    </header>
  );
}
