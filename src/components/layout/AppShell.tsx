"use client";

import { AppTopNavbar } from "@/components/layout/AppTopNavbar";
import { GmaoPortalHeader } from "@/components/dashboard/portal/gmao-portal-header";
import { SessionProvider } from "@/components/providers/session-provider";
import type { SessionUser } from "@/lib/auth/session";

function AppShellInner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full flex-col bg-slate-50 transition-colors duration-200 dark:bg-slate-950">
      <GmaoPortalHeader />
      <AppTopNavbar />
      <main className="density-page w-full min-w-0 flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <SessionProvider user={user}>
      <AppShellInner>{children}</AppShellInner>
    </SessionProvider>
  );
}
