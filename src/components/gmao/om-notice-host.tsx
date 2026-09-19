"use client";

import { CalendarCheck, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";

export type OmNoticeDetail = {
  created: boolean;
  reference: string;
  dayKey: string;
};

export const OM_NOTICE_EVENT = "gmao:om-notice";

export function dispatchOmNotice(detail: OmNoticeDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OM_NOTICE_EVENT, { detail }));
}

export function OmNoticeHost() {
  const [notice, setNotice] = React.useState<OmNoticeDetail | null>(null);

  React.useEffect(() => {
    function onNotice(event: Event) {
      const custom = event as CustomEvent<OmNoticeDetail>;
      if (!custom.detail) return;
      setNotice(custom.detail);
    }
    window.addEventListener(OM_NOTICE_EVENT, onNotice);
    return () => window.removeEventListener(OM_NOTICE_EVENT, onNotice);
  }, []);

  React.useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 8000);
    return () => window.clearTimeout(t);
  }, [notice]);

  if (!notice) return null;

  const dateLabel = notice.dayKey.split("-").reverse().join("/");

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="pointer-events-auto flex gap-3 rounded-xl border border-sky-200 bg-white p-3 shadow-lg">
        <CalendarCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#1F76FB]" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold text-slate-900">
            {notice.created ? "Ordre de maintenance créé" : "Intervention rattachée à l'OM"}
          </p>
          <p className="mt-0.5 text-slate-600">
            {notice.created
              ? `L'ordre ${notice.reference} a été généré pour le ${dateLabel}.`
              : `L'intervention a été associée à ${notice.reference} (${dateLabel}).`}
          </p>
          <Link href="/maintenance-orders" className="mt-1 inline-block text-xs font-medium text-[#1F76FB] hover:underline">
            Voir les ordres
          </Link>
        </div>
        <button type="button" className="h-6 w-6 shrink-0 text-slate-400 hover:text-slate-700" onClick={() => setNotice(null)} aria-label="Fermer">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
