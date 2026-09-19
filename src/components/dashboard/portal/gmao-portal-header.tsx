"use client";

import {
  CalendarCheck,
  ClipboardList,
  Database,
  LayoutDashboard,
  Package,
  Plus,
  Settings,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { ThemeToggleButton } from "@/components/layout/ThemeToggleButton";
import { UserProfileMenu } from "@/components/layout/UserProfileMenu";
import { useSession } from "@/components/providers/session-provider";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MODULES: { href: string; label: string; icon: LucideIcon; match?: (p: string) => boolean }[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, match: (p) => p === "/dashboard" },
  {
    href: "/donnees-de-base",
    label: "Données de base",
    icon: Database,
    match: (p) =>
      p.startsWith("/donnees-de-base") || p.startsWith("/machines") || p.startsWith("/technicians"),
  },
  { href: "/maintenance-orders", label: "Ordre de maintenance", icon: CalendarCheck },
  { href: "/interventions", label: "Liste de Maintenance", icon: ClipboardList },
  { href: "/stock", label: "Stock & Pièces", icon: Package },
];

const TECH_HIDDEN = new Set(["/stock"]);

export function GmaoPortalHeader() {
  const pathname = usePathname();
  const { isManager } = useSession();
  const items = isManager ? MODULES : MODULES.filter((m) => !TECH_HIDDEN.has(m.href));

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0B2A5B] text-white shadow-md">
      <div className="flex h-16 w-full min-w-0 items-center gap-3 px-3 md:gap-4 md:px-4 lg:px-5">
        <Link href="/dashboard" className="flex shrink-0 flex-col justify-center leading-tight">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-300">NutriFish</span>
          <span className="text-base font-bold tracking-tight">
            GMAO<span className="font-semibold text-sky-300"> Pro</span>
          </span>
        </Link>

        <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item) => {
            const active = item.match ? item.match(pathname) : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium lg:gap-2 lg:px-2.5",
                  active ? "bg-white/15 text-white" : "text-sky-100/90 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                <span className="hidden xl:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="w-[min(28vw,20rem)] min-w-[11rem] max-w-md shrink-0">
          <GlobalSearch tone="onDark" className="mx-auto w-full min-w-0 max-w-md" />
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <ThemeToggleButton className="h-9 w-9 text-sky-100 hover:bg-white/10 hover:text-white" />
          {isManager ? (
            <Link
              href="/maintenance-orders"
              aria-label="Configuration GMAO"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "hidden h-9 w-9 text-sky-100 hover:bg-white/10 hover:text-white xl:inline-flex",
              )}
            >
              <Settings className="h-4 w-4" />
            </Link>
          ) : null}
          <Link
            href="/interventions/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1F76FB] px-2.5 text-sm font-semibold text-white hover:bg-[#1865D9] lg:px-3"
          >
            <Plus className="h-4 w-4" aria-hidden />
            <span className="hidden lg:inline">Intervention</span>
          </Link>
          <UserProfileMenu tone="onDark" compact />
        </div>
      </div>
    </header>
  );
}
