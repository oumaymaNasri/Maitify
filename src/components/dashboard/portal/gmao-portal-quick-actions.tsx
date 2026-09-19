"use client";

import {
  CalendarCheck,
  ClipboardPlus,
  FileBarChart,
  HardHat,
  Package,
  Plus,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { useSession } from "@/components/providers/session-provider";

const ACTIONS: { href: string; label: string; icon: LucideIcon; managerOnly?: boolean }[] = [
  { href: "/interventions/new", label: "Créer intervention", icon: ClipboardPlus },
  { href: "/machines", label: "Nouvelle machine", icon: Settings2, managerOnly: true },
  { href: "/maintenance-orders", label: "Ordre de maintenance", icon: CalendarCheck },
  { href: "/interventions", label: "Rapport d'activité", icon: FileBarChart },
  { href: "/technicians", label: "Techniciens", icon: HardHat, managerOnly: true },
  { href: "/stock", label: "Liste des pièces", icon: Package, managerOnly: true },
  { href: "/interventions/new", label: "Saisie terrain", icon: Plus },
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
              className="group flex w-[4.75rem] flex-col items-center gap-2 text-center sm:w-24"
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
