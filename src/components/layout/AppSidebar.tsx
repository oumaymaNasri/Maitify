"use client";

import { ChevronLeft, ChevronRight, Fish } from "lucide-react";

import { useSidebarCollapsed } from "@/components/layout/sidebar-collapse";
import { SidebarNavContent } from "@/components/layout/SidebarNavContent";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type AppSidebarProps = {
  className?: string;
};

function SidebarBrand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1F76FB] text-white shadow-sm">
        <Fish className="h-5 w-5" aria-hidden />
      </div>
      {!collapsed ? (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[10px] font-bold uppercase tracking-widest text-slate-500">Nutrifish</p>
          <p className="truncate text-sm font-semibold text-slate-900">PRO GMAO</p>
        </div>
      ) : null}
    </div>
  );
}

function SidebarCollapseButton({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  if (!collapsed) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-full justify-start text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        onClick={onToggle}
        aria-expanded
        aria-label="Réduire la sidebar"
      >
        <ChevronLeft className="mr-1.5 h-4 w-4" />
        <span className="text-xs">Réduire</span>
      </Button>
    );
  }

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger
        type="button"
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "h-8 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        )}
        onClick={onToggle}
        aria-expanded={false}
        aria-label="Déplier la sidebar"
      >
        <ChevronRight className="h-4 w-4" />
      </TooltipTrigger>
      <TooltipContent side="right">Déplier</TooltipContent>
    </Tooltip>
  );
}

/** Structure flex partagée desktop / mobile */
export function SidebarPanel({
  collapsed,
  onToggle,
  showCollapse = true,
  className,
}: {
  collapsed: boolean;
  onToggle?: () => void;
  showCollapse?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex h-full min-h-0 flex-col justify-between", className)}>
      {/* Bloc haut : logo + navigation + nouvelle intervention */}
      <div className="flex min-h-0 flex-col space-y-1 overflow-y-auto">
        <SidebarBrand collapsed={collapsed} />
        <SidebarNavContent collapsed={collapsed} />
      </div>

      {/* Bloc bas : réduire — collé en bas */}
      <div className="mt-auto shrink-0 space-y-3 border-t border-slate-100 pt-4">
        {showCollapse && onToggle ? (
          <div className={collapsed ? "flex justify-center" : undefined}>
            <SidebarCollapseButton collapsed={collapsed} onToggle={onToggle} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AppSidebar({ className }: AppSidebarProps) {
  const { collapsed, toggle } = useSidebarCollapsed();

  return (
    <aside
      className={cn(
        "sticky top-0 z-20 flex h-screen shrink-0 flex-col justify-between border-r border-slate-200 bg-white p-4 transition-[width,background-color,border-color] duration-200 ease-out dark:border-slate-800 dark:bg-slate-950",
        collapsed ? "w-[4.25rem]" : "w-64",
        className,
      )}
    >
      <SidebarPanel collapsed={collapsed} onToggle={toggle} className="min-h-0 flex-1" />
    </aside>
  );
}
