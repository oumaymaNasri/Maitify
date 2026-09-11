"use client";

import * as React from "react";

import { canManage, isManager, roleLabelFr, type SessionUser } from "@/lib/auth/session";

type SessionContextValue = {
  user: SessionUser;
  isManager: boolean;
  canManage: (permission?: string) => boolean;
  roleLabel: string;
};

const SessionContext = React.createContext<SessionContextValue | null>(null);

export function SessionProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const value = React.useMemo<SessionContextValue>(
    () => ({
      user,
      isManager: isManager(user),
      canManage: (permission?: string) => canManage(user, permission),
      roleLabel: roleLabelFr(user.role),
    }),
    [user],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = React.useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession doit être utilisé dans SessionProvider.");
  }
  return ctx;
}
