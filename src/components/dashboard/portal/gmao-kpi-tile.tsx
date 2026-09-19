import Link from "next/link";

import { cn } from "@/lib/utils";

const ACCENT = {
  teal: "border-l-teal-500",
  orange: "border-l-orange-400",
  blue: "border-l-[#1F76FB]",
  rose: "border-l-rose-500",
} as const;

export function GmaoKpiTile({
  href,
  value,
  label,
  accent,
  valueClassName,
}: {
  href: string;
  value: string | number;
  label: string;
  accent: keyof typeof ACCENT;
  valueClassName?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-[108px] flex-col justify-center border-l-[5px] bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:shadow-md",
        ACCENT[accent],
      )}
    >
      <p className={cn("text-3xl font-semibold tabular-nums tracking-tight md:text-4xl", valueClassName ?? "text-teal-600")}>
        {value}
      </p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </Link>
  );
}

export function GmaoCtaTile({ href, title, subtitle }: { href: string; title: string; subtitle: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-[108px] flex-col justify-center bg-[#1F76FB] px-5 py-4 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#1865D9] hover:shadow-md"
    >
      <p className="text-lg font-semibold leading-tight">{title}</p>
      <p className="mt-1 text-sm text-sky-100">{subtitle}</p>
    </Link>
  );
}
