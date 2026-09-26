"use client";

import * as React from "react";

export type CatalogViewMode = "list" | "cards";

export function useCatalogViewMode(storageKey: string, fallback: CatalogViewMode = "list") {
  const [mode, setMode] = React.useState<CatalogViewMode>(fallback);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === "list" || stored === "cards") setMode(stored);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const onChange = React.useCallback(
    (next: CatalogViewMode) => {
      setMode(next);
      try {
        window.localStorage.setItem(storageKey, next);
      } catch {
        /* ignore */
      }
    },
    [storageKey],
  );

  return [mode, onChange] as const;
}
