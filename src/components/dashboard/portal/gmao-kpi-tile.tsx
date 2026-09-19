import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

const ACCENT = {
  teal: "border-l-teal-500",
  orange: "border-l-orange-400",
  blue: "border-l-[#1F76FB]",
  rose: "border-l-rose-500",
} as const;

export function trendFromCounts(current: number, previous: number): { deltaPct: number | null; up: boolean; flat: boolean } {
  if (previous <= 0 && current <= 0) return { deltaPct: 0, up: false, flat: true };
  if (previous <= 0) return { deltaPct: 100, up: true, flat: false };
  const deltaPct = Math.round(((current - previous) / previous) * 100);
  return { deltaPct, up: deltaPct > 0, flat: deltaPct === 0 };
}

export function GmaoKpiTile({
  href,
  value,
  label,
  accent,
  valueClassName,
  trend,
}: {
  href: string;
  value: string | number;
  label: string;
  accent: keyof typeof ACCENT;
  valueClassName?: string;
  trend?: { deltaPct: number | null; up: boolean; flat: boolean; hint?: string };
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-[120px] flex-col justify-center border-l-[5px] bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:shadow-md",
        ACCENT[accent],
      )}
    >
      <p className={cn("text-3xl font-semibold tabular-nums tracking-tight md:text-4xl", valueClassName ?? "text-teal-600")}>
        {value}
      </p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
      {trend ? (
        <p
          className={cn(
            "mt-2 inline-flex items-center gap-1 text-xs font-medium",
            trend.flat ? "text-slate-400" : trend.up ? "text-teal-600" : "text-orange-500",
          )}
        >
          {trend.flat ? <Minus className="h-3.5 w-3.5" /> : trend.up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {trend.deltaPct == null ? "—" : `${trend.deltaPct > 0 ? "+" : ""}${trend.deltaPct} %`}
          <span className="font-normal text-slate-400">{trend.hint ?? "vs mois précédent"}</span>
        </p>
      ) : null}
    </Link>
  );
}

export function GmaoCtaTile({ href, title, subtitle }: { href: string; title: string; subtitle: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-[120px] flex-col justify-center bg-[#1F76FB] px-5 py-4 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#1865D9] hover:shadow-md"
    >
      <p className="text-lg font-semibold leading-tight">{title}</p>
      <p className="mt-1 text-sm text-sky-100">{subtitle}</p>
    </Link>
  );
}
