import type { MachineAssetStatus } from "@prisma/client";

/** Badges institutionnels — fond clair, texte lisible */
export function machineStatusBadgeClass(status: MachineAssetStatus): string {
  switch (status) {
    case "OPERATIONAL":
      return "border border-emerald-200 bg-emerald-50 text-emerald-700";
    case "UNDER_MAINTENANCE":
      return "border border-amber-200 bg-amber-50 text-amber-700";
    case "DOWN":
      return "border border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border border-slate-200 bg-slate-50 text-slate-700";
  }
}

export function stockCriticalBadgeClass(): string {
  return "border border-rose-200 bg-rose-50 text-rose-700";
}

export function technicianAvailabilityBadgeClass(availability: "DISPONIBLE" | "EN_INTERVENTION"): string {
  return availability === "DISPONIBLE"
    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border border-amber-200 bg-amber-50 text-amber-700";
}
