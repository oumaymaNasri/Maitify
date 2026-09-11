"use client";

import * as React from "react";

const STORAGE_KEY = "nutrifish-sidebar-collapsed";

type Ctx = {
  collapsed: boolean;
  toggle: () => void;
};

const SidebarCollapseContext = React.createContext<Ctx | null>(null);

export function SidebarCollapseProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      setCollapsed(v === "1");
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const toggle = React.useCallback(() => {
    setCollapsed((c) => {
      const n = !c;
      try {
        localStorage.setItem(STORAGE_KEY, n ? "1" : "0");
      } catch {
        /* ignore */
      }
      return n;
    });
  }, []);

  if (!ready) {
    return <SidebarCollapseContext.Provider value={{ collapsed: false, toggle }}>{children}</SidebarCollapseContext.Provider>;
  }

  return <SidebarCollapseContext.Provider value={{ collapsed, toggle }}>{children}</SidebarCollapseContext.Provider>;
}

export function useSidebarCollapsed(): Ctx {
  const ctx = React.useContext(SidebarCollapseContext);
  if (!ctx) throw new Error("useSidebarCollapsed must be inside SidebarCollapseProvider");
  return ctx;
}
