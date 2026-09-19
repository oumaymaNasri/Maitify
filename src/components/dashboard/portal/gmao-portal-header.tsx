"use client";

import {
  CalendarCheck,
  ClipboardList,
  Cpu,
  HardHat,
  LayoutDashboard,
  Package,
  Plus,
  Settings,
  type LucideIcon,
} from "lucide-react";
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
  { ssr: false, loading: () => <div className="h-9 min-w-0 flex-1" /> },
);

const MODULES: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/machines", label: "Machines", icon: Cpu },
  { href: "/technicians", label: "Techniciens", icon: HardHat },
  { href: "/maintenance-orders", label: "Ordre de maintenance", icon: CalendarCheck },
  { href: "/interventions", label: "Liste de Maintenance", icon: ClipboardList },
  { href: "/stock", label: "Stock & Pièces", icon: Package },
];

const TECH_HIDDEN = new Set(["/stock", "/technicians"]);

export function GmaoPortalHeader() {
  const pathname = usePathname();
  const { isManager } = useSession();
  const items = isManager ? MODULES : MODULES.filter((m) => !TECH_HIDDEN.has(m.href));

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0B2A5B] text-white shadow-md">
      <div className="flex h-16 w-full items-center gap-x-4 overflow-x-auto whitespace-nowrap px-4 [scrollbar-width:none] md:gap-x-6 md:px-5 lg:px-6 [&::-webkit-scrollbar]:hidden">
        <Link href="/dashboard" className="flex shrink-0 flex-col justify-center leading-tight whitespace-normal">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-300">NutriFish</span>
          <span className="text-base font-bold tracking-tight">
            GMAO<span className="font-semibold text-sky-300"> Pro</span>
          </span>
        </Link>

        <nav className="flex shrink-0 items-center gap-x-1 md:gap-x-2">
          {items.map((item) => {
            const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-x-2 rounded-lg px-2.5 py-1.5 text-sm font-medium",
                  active ? "bg-white/15 text-white" : "text-sky-100/90 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="min-w-[10rem] flex-1">
          <GlobalSearch tone="onDark" className="w-full min-w-0" />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggleButton className="h-9 w-9 text-sky-100 hover:bg-white/10 hover:text-white" />
          {isManager ? (
            <Link
              href="/maintenance-orders"
              aria-label="Configuration GMAO"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "hidden h-9 w-9 text-sky-100 hover:bg-white/10 hover:text-white lg:inline-flex",
              )}
            >
              <Settings className="h-4 w-4" />
            </Link>
          ) : null}
          <Link
            href="/interventions/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1F76FB] px-3 text-sm font-semibold text-white hover:bg-[#1865D9]"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Intervention
          </Link>
          <UserProfileMenu tone="onDark" />
        </div>
      </div>
    </header>
  );
}
