"use client";

import { X } from "lucide-react";
import * as React from "react";

import { AppSidebar, SidebarPanel } from "@/components/layout/AppSidebar";
import { AppTopNavbar } from "@/components/layout/AppTopNavbar";
import { SessionProvider } from "@/components/providers/session-provider";
import { SidebarCollapseProvider } from "@/components/layout/sidebar-collapse";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/lib/auth/session";

function AppShellInner({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    const onResize = () => {
      if (window.matchMedia("(min-width: 768px)").matches) setMobileOpen(false);
    };
    const onClose = () => setMobileOpen(false);
    window.addEventListener("resize", onResize);
    window.addEventListener("nutrifish-close-mobile-nav", onClose);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("nutrifish-close-mobile-nav", onClose);
    };
  }, []);

  return (
    <div className="flex min-h-dvh bg-slate-50 transition-colors duration-200 dark:bg-slate-950">
      <AppSidebar className="hidden md:flex" />

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/20 md:hidden"
          aria-label="Fermer le menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-[min(17rem,92vw)] flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-200 dark:border-slate-800 dark:bg-slate-950 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex shrink-0 items-center justify-end border-b border-slate-200 px-2 py-2 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-600"
            onClick={() => setMobileOpen(false)}
            aria-label="Fermer le menu"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 p-4">
          <SidebarPanel collapsed={false} showCollapse={false} className="h-full min-h-0" />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopNavbar onOpenMobileNav={() => setMobileOpen(true)} />
        <main className="density-page min-w-0 flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <SessionProvider user={user}>
      <SidebarCollapseProvider>
        <AppShellInner>{children}</AppShellInner>
      </SidebarCollapseProvider>
    </SessionProvider>
  );
}
