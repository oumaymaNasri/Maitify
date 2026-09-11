"use client";

import * as React from "react";

function subscribeNoop() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

/** Valeur retardée ; première passe SSR/hydratation = valeur immédiate (pas de mismatch). */
export function useDebouncedValue<T>(value: T, delayMs = 150): T {
  const mounted = React.useSyncExternalStore(subscribeNoop, getClientSnapshot, getServerSnapshot);
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    if (!mounted) return;
    const handle = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(handle);
  }, [value, delayMs, mounted]);

  React.useEffect(() => {
    if (mounted) setDebounced(value);
  }, [mounted]);

  return mounted ? debounced : value;
}
