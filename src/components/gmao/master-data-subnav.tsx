"use client";

import { Cpu, HardHat } from "lucide-react";
import { usePathname } from "next/navigation";

import { ModuleSubnav } from "@/components/gmao/module-subnav";
import { useSession } from "@/components/providers/session-provider";

export function MasterDataSubnav() {
  const pathname = usePathname();
  const { isManager } = useSession();

  const items = [
    { href: "/donnees-de-base/machines", label: "Machines", icon: Cpu },
    ...(isManager
      ? [{ href: "/donnees-de-base/technicians", label: "Techniciens", icon: HardHat }]
      : []),
  ];

  return <ModuleSubnav items={items} pathname={pathname} />;
}
