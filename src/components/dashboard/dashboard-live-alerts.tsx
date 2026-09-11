"use client";

import type { AlertSeverity, AlertType } from "@prisma/client";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";

export type LiveAlertVm = {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  createdAt: string;
};

function severityClass(s: AlertSeverity): string {
  switch (s) {
    case "CRITICAL":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "WARNING":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export function DashboardLiveAlerts({ alerts }: { alerts: LiveAlertVm[] }) {
  if (!alerts.length) return null;

  const hasWater = alerts.some((a) => a.type === "WATER_QUALITY");

  return (
    <aside
      className={`rounded-lg border bg-white px-4 py-3 shadow-sm ${
        hasWater ? "border-rose-200" : "border-amber-200"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <AlertTriangle
          className={`h-4 w-4 shrink-0 ${hasWater ? "text-rose-600" : "text-amber-600"}`}
          aria-hidden
        />
        Alertes temps réel
        <Badge variant="outline" className="text-[10px]">
          {alerts.length} ouverte(s)
        </Badge>
        <Link href="/water-quality" className="ml-auto text-xs font-medium text-blue-600 underline-offset-4 hover:underline">
          Module eau
        </Link>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {alerts.slice(0, 6).map((a) => (
          <li key={a.id} className={`rounded-md border p-3 text-sm ${severityClass(a.severity)}`}>
            <p className="font-semibold leading-tight">{a.title}</p>
            <p className="mt-1 line-clamp-3 text-xs">{a.message}</p>
            <p className="mt-2 text-[10px] text-slate-600">
              {new Intl.DateTimeFormat("fr-FR", {
                dateStyle: "short",
                timeStyle: "short",
              }).format(new Date(a.createdAt))}
            </p>
          </li>
        ))}
      </ul>
    </aside>
  );
}
