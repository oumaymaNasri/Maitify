"use client";

import * as React from "react";

/** Retourne `null` avant hydratation pour éviter le double montage. */
export function useIsDesktopNav(breakpointPx = 640): boolean | null {
  const [isDesktop, setIsDesktop] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpointPx}px)`);
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [breakpointPx]);

  return isDesktop;
}
