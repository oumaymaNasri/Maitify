"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

/** Ouvre un volet détail à partir de `?detail=<id>` puis nettoie l'URL. */
export function useDetailQueryParam(onOpen: (id: string) => void) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const onOpenRef = React.useRef(onOpen);
  onOpenRef.current = onOpen;

  React.useEffect(() => {
    const detailId = searchParams.get("detail")?.trim();
    if (!detailId) return;

    onOpenRef.current(detailId);

    const next = new URLSearchParams(searchParams.toString());
    next.delete("detail");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, pathname, router]);
}
