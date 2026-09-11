"use client";

import {
  CalendarCheck,
  ClipboardList,
  HardHat,
  LayoutDashboard,
  Package,
  Plus,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSession } from "@/components/providers/session-provider";
import { cn } from "@/lib/utils";

const TECHNICIAN_HIDDEN_HREFS = new Set(["/technicians", "/stock"]);

export const sidebarNavItems: {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: (path: string) => boolean;
}[] = [
  {
    href: "/dashboard",
    label: "Tableau de bord",
    icon: LayoutDashboard,
    match: (p) => p === "/dashboard",
  },
  {
    href: "/machines",
    label: "Liste des Machines",
    icon: Settings2,
    match: (p) => p.startsWith("/machines"),
  },
  {
    href: "/technicians",
    label: "Liste des Techniciens",
    icon: HardHat,
    match: (p) => p.startsWith("/technicians"),
  },
  {
    href: "/maintenance-orders",
    label: "Ordre de maintenance",
    icon: CalendarCheck,
    match: (p) => p.startsWith("/maintenance-orders"),
  },
  {
    href: "/interventions",
    label: "Liste de Maintenance",
    icon: ClipboardList,
    match: (p) => p.startsWith("/interventions"),
  },
  {
    href: "/stock",
    label: "Stock & Pièces",
    icon: Package,
    match: (p) => p.startsWith("/stock") || p.startsWith("/parts"),
  },
];

export function SidebarNavContent({ collapsed, className }: { collapsed?: boolean; className?: string }) {
  const pathname = usePathname();
  const { isManager } = useSession();

  const visibleNavItems = React.useMemo(
    () => (isManager ? sidebarNavItems : sidebarNavItems.filter((item) => !TECHNICIAN_HIDDEN_HREFS.has(item.href))),
    [isManager],
  );

  const closeMobile = () => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      window.dispatchEvent(new CustomEvent("nutrifish-close-mobile-nav"));
    }
  };

  const NavLink = ({ item }: { item: (typeof sidebarNavItems)[number] }) => {
    const Icon = item.icon;
    const active = item.match ? item.match(pathname ?? "") : pathname === item.href;
    const cls = cn(
      "group relative flex items-center rounded-md text-[13px] font-medium transition-colors",
      collapsed ? "justify-center px-0 py-2" : "gap-2.5 px-2.5 py-2",
      active
        ? "bg-[#E8F1FF] text-[#1F76FB] before:absolute before:left-0 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-[#1F76FB] before:content-['']"
        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
    );

    const inner = (
      <Link href={item.href} className={cls} onClick={closeMobile}>
        <Icon className={cn("h-4 w-4 shrink-0", active && "text-[#1F76FB]")} aria-hidden />
        {!collapsed ? <span className="truncate">{item.label}</span> : null}
      </Link>
    );

    if (!collapsed) return inner;

    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Link href={item.href} className={cls} onClick={closeMobile}>
            <Icon className={cn("h-4 w-4 shrink-0", active && "text-[#1F76FB]")} aria-hidden />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  };

  const newInterventionLink = (
    <Link
      href="/interventions/new"
      className={cn(
        "flex items-center rounded-md border border-dashed border-[#1F76FB]/40 bg-[#E8F1FF] text-xs font-medium text-[#1F76FB] transition-colors hover:bg-[#E8F1FF]",
        collapsed ? "justify-center p-2" : "justify-center gap-1.5 px-2.5 py-2",
      )}
      onClick={closeMobile}
    >
      <Plus className="h-4 w-4 shrink-0" aria-hidden />
      {!collapsed ? <span>+ Nouvelle intervention</span> : null}
    </Link>
  );

  return (
    <div className={cn("flex flex-col space-y-1", className)}>
      <nav className={cn("flex flex-col space-y-1", collapsed && "items-stretch")}>
        {!collapsed ? (
          <p className="px-2.5 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Modules GMAO
          </p>
        ) : (
          <span className="sr-only">Navigation principale</span>
        )}
        {visibleNavItems.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {collapsed ? (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Link
              href="/interventions/new"
              className={cn(
                "flex items-center justify-center rounded-md border border-dashed border-[#1F76FB]/40 bg-[#E8F1FF] p-2 text-xs font-medium text-[#1F76FB] transition-colors hover:bg-[#E8F1FF]",
              )}
              onClick={closeMobile}
              aria-label="Nouvelle intervention"
            >
              <Plus className="h-4 w-4 shrink-0" aria-hidden />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            Nouvelle intervention
          </TooltipContent>
        </Tooltip>
      ) : (
        newInterventionLink
      )}
    </div>
  );
}
