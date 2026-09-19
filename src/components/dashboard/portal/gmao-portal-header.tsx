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
  { ssr: false, loading: () => <div className="h-8 min-w-0 flex-1" /> },
);

const MODULES = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/machines", label: "Machines" },
  { href: "/technicians", label: "Techniciens" },
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
      <div className="flex h-12 w-full items-center gap-2 overflow-x-auto whitespace-nowrap px-3 [scrollbar-width:none] md:gap-2.5 md:px-4 lg:px-6 [&::-webkit-scrollbar]:hidden">
        <Link href="/dashboard" className="shrink-0 leading-none">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-300">NutriFish</span>
          <span className="ml-1.5 text-sm font-bold tracking-tight lg:text-base">
            GMAO<span className="font-semibold text-sky-300"> Pro</span>
          </span>
        </Link>

        <nav className="flex shrink-0 items-center gap-0.5">
          {items.map((item) => {
            const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-1.5 py-1 text-xs font-medium lg:px-2",
                  active ? "bg-white/15 text-white" : "text-sky-100/85 hover:bg-white/10 hover:text-white",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="min-w-[10rem] flex-1">
          <GlobalSearch tone="onDark" className="w-full min-w-0" />
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggleButton className="h-8 w-8 text-sky-100 hover:bg-white/10 hover:text-white" />
          {isManager ? (
            <Link
              href="/maintenance-orders"
              aria-label="Configuration GMAO"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "hidden h-8 w-8 text-sky-100 hover:bg-white/10 hover:text-white lg:inline-flex",
              )}
            >
              <Settings className="h-4 w-4" />
            </Link>
          ) : null}
          <Link
            href="/interventions/new"
            className="inline-flex items-center gap-1 rounded-md bg-[#1F76FB] px-2 py-1 text-xs font-semibold text-white hover:bg-[#1865D9]"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Intervention
          </Link>
          <UserProfileMenu tone="onDark" compact />
        </div>
      </div>
    </header>
  );
}
