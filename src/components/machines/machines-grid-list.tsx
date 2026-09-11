"use client";

import * as React from "react";

import type { MachineCardVm } from "@/components/machines/machine-card";
import { MachinePremiumCard } from "@/components/machines/machine-premium-card";

type MachinesGridListProps = {
  machines: MachineCardVm[];
  onView: (machine: MachineCardVm) => void;
  onDeleted: () => void;
  isPending?: boolean;
};

function MachinesGridListInner({ machines, onView, onDeleted, isPending }: MachinesGridListProps) {
  if (machines.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-600">
        Aucun équipement ne correspond aux filtres.
      </p>
    );
  }

  return (
    <div
      className={`grid gap-4 sm:grid-cols-2 2xl:grid-cols-3 ${isPending ? "opacity-70 transition-opacity" : "transition-opacity"}`}
    >
      {machines.map((m) => (
        <MachinePremiumCard key={m.id} machine={m} onView={onView} onDeleted={onDeleted} />
      ))}
    </div>
  );
}

export const MachinesGridList = React.memo(MachinesGridListInner);
