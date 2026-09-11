"use client";

import { MachineAssetStatus } from "@prisma/client";
import { Search } from "lucide-react";
import * as React from "react";

import { AddMachineSheet } from "@/components/machines/add-machine-sheet";
import { MachineCard, type MachineCardVm } from "@/components/machines/machine-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { maintenanceFrequencyFr } from "@/lib/view/gmao-labels";

type StatusFilter = "ALL" | MachineAssetStatus;

export function MachineInventoryClient({ machines }: { machines: MachineCardVm[] }) {
  const [q, setQ] = React.useState("");
  const deferredQ = React.useDeferredValue(q);
  const [status, setStatus] = React.useState<StatusFilter>("ALL");
  const [location, setLocation] = React.useState<string>("ALL");
  const isFiltering = q !== deferredQ;

  const locations = React.useMemo(() => {
    const set = new Set(machines.map((m) => m.location.trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [machines]);

  const filtered = React.useMemo(() => {
    const needle = deferredQ.trim().toLowerCase();
    return machines.filter((m) => {
      if (status !== "ALL" && m.assetStatus !== status) return false;
      if (location !== "ALL" && m.location !== location) return false;
      if (!needle) return true;
      const blob =
        `${m.name} ${m.location} ${maintenanceFrequencyFr(m.maintenanceSector)} ${m.legacyMatricule ?? ""}`.toLowerCase();
      return blob.includes(needle);
    });
  }, [machines, deferredQ, status, location]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold tabular-nums text-foreground">{filtered.length}</span>
          {" "}
          équipement(s) affiché(s)
        </p>
        <AddMachineSheet />
      </div>

      <div className="grid gap-3 rounded-xl border border-border/80 bg-card/50 p-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="machine-search" className="text-xs">
            Recherche
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="machine-search"
              placeholder="Nom, emplacement, secteur…"
              className="h-9 pl-9 text-sm"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Statut</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les statuts</SelectItem>
              <SelectItem value={MachineAssetStatus.OPERATIONAL}>Opérationnel</SelectItem>
              <SelectItem value={MachineAssetStatus.UNDER_MAINTENANCE}>En maintenance</SelectItem>
              <SelectItem value={MachineAssetStatus.DOWN}>En panne</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Emplacement</Label>
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les emplacements</SelectItem>
              {locations.map((loc) => (
                <SelectItem key={loc} value={loc}>
                  {loc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isFiltering ? <p className="text-xs text-muted-foreground">Filtrage…</p> : null}

      <div className={isFiltering ? "opacity-70 transition-opacity" : ""}>
        {filtered.length === 0 ? (
          <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
            Aucun équipement ne correspond aux filtres.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {filtered.map((m) => (
              <MachineCard key={m.id} machine={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
