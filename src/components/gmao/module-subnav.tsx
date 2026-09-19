"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type ModuleSubnavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: (pathname: string) => boolean;
};

export function ModuleSubnav({
  items,
  pathname,
}: {
  items: ModuleSubnavItem[];
  pathname: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="tablist">
      {items.map((item) => {
        const active = item.match ? item.match(pathname) : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            role="tab"
            aria-selected={active}
            className={cn(
              "flex flex-row items-center gap-x-2 rounded-xl border px-3 py-2 text-sm font-medium transition",
              active
                ? "border-[#1F76FB]/30 bg-[#E8F1FF] text-[#0B2A5B]"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-[#0B2A5B]",
            )}
          >
            <Icon className="h-5 w-5 shrink-0 text-[#1F76FB]" strokeWidth={1.75} />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
