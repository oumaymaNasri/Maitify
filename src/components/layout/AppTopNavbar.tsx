"use client";

import dynamic from "next/dynamic";
import { Menu, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggleButton } from "@/components/layout/ThemeToggleButton";
import { useIsDesktopNav } from "@/components/layout/use-is-desktop-nav";
import { UserProfileMenu } from "@/components/layout/UserProfileMenu";
import { useSession } from "@/components/providers/session-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getPageMeta } from "@/lib/navigation/page-meta";
import { cn } from "@/lib/utils";

const GlobalSearch = dynamic(
  () => import("@/components/layout/GlobalSearch").then((m) => ({ default: m.GlobalSearch })),
  { ssr: false, loading: () => null },
);

type AppTopNavbarProps = {
  onOpenMobileNav?: () => void;
};

export function AppTopNavbar({ onOpenMobileNav }: AppTopNavbarProps) {
  const pathname = usePathname();
  const meta = getPageMeta(pathname);
  const { isManager } = useSession();
  const isDesktop = useIsDesktopNav();

  const globalSearch =
    isDesktop === true ? (
      <GlobalSearch key="global-search" className="min-w-0 flex-1" />
    ) : isDesktop === false ? (
      <div className="border-t border-slate-200 px-3 pb-2 pt-2 dark:border-slate-800">
        <GlobalSearch key="global-search" />
      </div>
    ) : null;

  return (
    <header className="z-30 flex h-auto w-full shrink-0 flex-col justify-center border-b border-slate-200 bg-white shadow-sm transition-colors duration-200 dark:border-slate-800 dark:bg-slate-950 sm:h-14">
      <div className="flex h-14 items-center gap-2 px-3 md:gap-3 md:px-4">
        {onOpenMobileNav ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 md:hidden"
            onClick={onOpenMobileNav}
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5 text-slate-700 dark:text-slate-200" />
          </Button>
        ) : null}

        <div className="min-w-0 shrink-0 md:w-[min(220px,28vw)]">
          <h1 className="truncate text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100 md:text-base">{meta.title}</h1>
          {meta.subtitle ? (
            <p className="hidden truncate text-[11px] text-slate-600 dark:text-slate-400 sm:block">{meta.subtitle}</p>
          ) : null}
        </div>

        <Separator orientation="vertical" className="mx-0.5 hidden h-8 md:block" />

        {isDesktop === true ? globalSearch : null}

        <div className="ml-auto flex shrink-0 items-center gap-1 md:gap-1.5">
          <ThemeToggleButton className="hidden h-9 w-9 text-slate-600 dark:text-slate-300 sm:inline-flex" />
          {isManager ? (
            <Link
              href="/maintenance-orders"
              aria-label="Configuration GMAO"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "hidden h-9 w-9 text-slate-600 dark:text-slate-300 sm:inline-flex",
              )}
            >
              <Settings className="h-4 w-4" />
            </Link>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden h-9 w-9 text-slate-600 dark:text-slate-300 sm:inline-flex"
              aria-label="Paramètres (bientôt)"
              disabled
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
          <UserProfileMenu />
        </div>
      </div>

      {isDesktop === false ? globalSearch : null}
    </header>
  );
}
