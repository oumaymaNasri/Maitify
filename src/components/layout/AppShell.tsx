"use client";

import type { ReactNode } from "react";

import { GmaoPortalHeader } from "@/components/dashboard/portal/gmao-portal-header";
import { OmNoticeHost } from "@/components/gmao/om-notice-host";
import { SessionProvider } from "@/components/providers/session-provider";
import type { SessionUser } from "@/lib/auth/session";

export function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  return (
    <SessionProvider user={user}>
      <div className="flex min-h-dvh w-full flex-col bg-slate-50 transition-colors duration-200 dark:bg-slate-950">
        <GmaoPortalHeader />
        <OmNoticeHost />
        <main className="density-page w-full min-w-0 flex-1 overflow-x-hidden">{children}</main>
      </div>
    </SessionProvider>
  );
}
