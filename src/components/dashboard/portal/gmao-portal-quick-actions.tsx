"use client";

import {
  CalendarCheck,
  ClipboardPlus,
  FileBarChart,
  HardHat,
  Package,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { useSession } from "@/components/providers/session-provider";

const ACTIONS: { href: string; label: string; icon: LucideIcon; managerOnly?: boolean }[] = [
  { href: "/interventions/new", label: "Créer intervention", icon: ClipboardPlus },
  { href: "/donnees-de-base/machines", label: "Liste des Machines", icon: Settings2, managerOnly: true },
  { href: "/maintenance-orders", label: "Ordre de maintenance", icon: CalendarCheck },
  { href: "/interventions", label: "Liste de Maintenance", icon: FileBarChart },
  { href: "/donnees-de-base/technicians", label: "Liste des Techniciens", icon: HardHat, managerOnly: true },
  { href: "/stock", label: "Stock & Pièces", icon: Package, managerOnly: true },
];

export function GmaoPortalQuickActions() {
  const { isManager } = useSession();
  const items = ACTIONS.filter((a) => isManager || !a.managerOnly);

  return (
    <div className="border-b border-slate-200/80 bg-white/80 px-4 py-5 backdrop-blur md:px-8">
      <div className="flex flex-wrap items-start justify-center gap-6 md:justify-end md:gap-8">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className="group flex w-24 flex-col items-center gap-2 text-center sm:w-28"
            >
              <span className="flex h-12 w-12 items-center justify-center text-[#1F76FB] transition group-hover:scale-105">
                <Icon className="h-9 w-9" strokeWidth={1.5} />
              </span>
              <span className="text-[11px] font-medium leading-tight text-slate-600 group-hover:text-[#0B2A5B]">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
