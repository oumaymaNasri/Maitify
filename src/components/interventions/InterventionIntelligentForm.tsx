"use client";

import * as React from "react";

import { createMaintenanceLogWithParts } from "@/app/actions/maintenance-log";
import { dispatchOmNotice } from "@/components/gmao/om-notice-host";
import { SearchableVirtualSelect } from "@/components/gmao/searchable-virtual-select";
import { InterventionFicheButton } from "@/components/interventions/intervention-fiche-button";
import { SparePartSearchSelect } from "@/components/interventions/spare-part-search-select";
import { TouchSignaturePad } from "@/components/interventions/TouchSignaturePad";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActiveMaintenanceOrderOption } from "@/lib/gmao/maintenance-orders-query";
import { calendarDayKey } from "@/lib/gmao/intervention-status";
import { formatDateFrShort } from "@/lib/utils/format-date";
import { cn } from "@/lib/utils";

export type MachineOption = { id: string; name: string; legacyMatricule: number | null };
export type TechnicianOption = { id: string; label: string; availability: string };
export type PartOption = { id: string; designation: string; reference: string | null; quantity: number; minStock: number };

function omSearchLabel(order: ActiveMaintenanceOrderOption): { label: string; description: string } {
  const date = formatDateFrShort(order.plannedDate);
  const names = order.lines.map((l) => l.machineName);
  const machines =
    names.length === 0
      ? "Aucune ligne préventive ouverte"
      : names.length <= 2
        ? names.join(", ")
        : `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
  const kind = order.lines.length > 0 ? "Préventive" : "OM journalier";
  return {
    label: `${order.reference} · ${date} · ${kind}`,
    description: machines,
  };
}

function dayKeyFromInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return calendarDayKey(d);
}

function localNowForInput(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

async function readImageFile(file: File, maxKb: number): Promise<string | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const s = String(reader.result ?? "");
      if (s.length > maxKb * 1024) {
        resolve(null);
        return;
      }
      resolve(s);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export function InterventionIntelligentForm({
  machines,
  technicians,
  spareParts,
  maintenanceOrders = [],
  lockedTechnicianId,
}: {
  machines: MachineOption[];
  technicians: TechnicianOption[];
  spareParts: PartOption[];
  maintenanceOrders?: ActiveMaintenanceOrderOption[];
  lockedTechnicianId?: string;
}) {
  const [pending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [createdId, setCreatedId] = React.useState<string | null>(null);
  const [sigReset, setSigReset] = React.useState(0);
  const [signatureDataUrl, setSignatureDataUrl] = React.useState("");
  const [photoBeforeUrl, setPhotoBeforeUrl] = React.useState("");
  const [photoAfterUrl, setPhotoAfterUrl] = React.useState("");
  const [lines, setLines] = React.useState<{ partId: string; quantity: number }[]>([{ partId: "", quantity: 1 }]);
  const [selectedOrderId, setSelectedOrderId] = React.useState("");
  const [machineId, setMachineId] = React.useState("");
  const [technicianId, setTechnicianId] = React.useState(lockedTechnicianId ?? "");
  const [operationType, setOperationType] = React.useState("CONTROLE");
  const [interventionKind, setInterventionKind] = React.useState<"PREVENTIVE" | "CORRECTIVE">("PREVENTIVE");
  const [dateValue, setDateValue] = React.useState(localNowForInput);
  const [omDateFilter, setOmDateFilter] = React.useState(() => localNowForInput().slice(0, 10));
  const [omMachineFilter, setOmMachineFilter] = React.useState("");
  const omPickedByUser = React.useRef(false);
  const [maintenanceOrderLineId, setMaintenanceOrderLineId] = React.useState("");
  const [preventiveCleaning, setPreventiveCleaning] = React.useState(false);
  const [preventiveLubrication, setPreventiveLubrication] = React.useState(false);
  const [preventiveOil, setPreventiveOil] = React.useState(false);
  const [preventiveControl, setPreventiveControl] = React.useState(false);
  const [preventiveNonConforme, setPreventiveNonConforme] = React.useState(false);

  const selectedOrder = React.useMemo(
    () => maintenanceOrders.find((o) => o.id === selectedOrderId) ?? null,
    [maintenanceOrders, selectedOrderId],
  );

  const availableMachines = React.useMemo(() => {
    if (!selectedOrder || interventionKind !== "PREVENTIVE" || selectedOrder.lines.length === 0) return machines;
    const ids = new Set(selectedOrder.lines.map((l) => l.machineId));
    return machines.filter((m) => ids.has(m.id));
  }, [machines, selectedOrder, interventionKind]);

  const machineOptions = React.useMemo(
    () =>
      availableMachines.map((m) => ({
        value: m.id,
        label: m.legacyMatricule != null ? `${m.name} · M${m.legacyMatricule}` : m.name,
      })),
    [availableMachines],
  );
  const technicianOptions = React.useMemo(
    () => technicians.map((t) => ({ value: t.id, label: t.label })),
    [technicians],
  );

  const allMachineOptions = React.useMemo(
    () =>
      machines.map((m) => ({
        value: m.id,
        label: m.legacyMatricule != null ? `${m.name} · M${m.legacyMatricule}` : m.name,
      })),
    [machines],
  );

  const applyLinePrefill = React.useCallback(
    (
      order: ActiveMaintenanceOrderOption | null,
      nextMachineId: string,
      kind: "PREVENTIVE" | "CORRECTIVE" = interventionKind,
    ) => {
      if (!order || !nextMachineId) {
        setMaintenanceOrderLineId("");
        return;
      }
      const line = order.lines.find((l) => l.machineId === nextMachineId);
      if (!line) {
        setMaintenanceOrderLineId("");
        return;
      }
      setMaintenanceOrderLineId(line.lineId);
      if (kind === "PREVENTIVE") {
        setOperationType("CONTROLE");
        setPreventiveCleaning(line.taskNettoyage);
        setPreventiveLubrication(line.taskGraissage);
        setPreventiveOil(line.taskHuile);
        setPreventiveControl(line.taskControl);
        setPreventiveNonConforme(line.taskNonConforme);
      }
    },
    [interventionKind],
  );

  const resetPreventiveTasks = React.useCallback(() => {
    setPreventiveCleaning(false);
    setPreventiveLubrication(false);
    setPreventiveOil(false);
    setPreventiveControl(false);
    setPreventiveNonConforme(false);
  }, []);

  const applyOrder = React.useCallback(
    (orderId: string, pickedByUser: boolean, kind: "PREVENTIVE" | "CORRECTIVE" = interventionKind) => {
      if (pickedByUser) omPickedByUser.current = true;
      setSelectedOrderId(orderId);
      if (!orderId) {
        setMaintenanceOrderLineId("");
        if (kind === "PREVENTIVE") setOperationType("CONTROLE");
        resetPreventiveTasks();
        return;
      }
      const order = maintenanceOrders.find((o) => o.id === orderId) ?? null;
      if (kind !== "PREVENTIVE") {
        setMaintenanceOrderLineId("");
        resetPreventiveTasks();
        return;
      }
      if (!order?.lines.length) {
        setMaintenanceOrderLineId("");
        resetPreventiveTasks();
        return;
      }
      const preferred =
        (machineId && order.lines.find((l) => l.machineId === machineId)) ||
        (order.lines.length === 1 ? order.lines[0] : null);
      if (preferred) {
        setMachineId(preferred.machineId);
        applyLinePrefill(order, preferred.machineId, "PREVENTIVE");
      } else {
        setMachineId("");
        setMaintenanceOrderLineId("");
      }
    },
    [applyLinePrefill, interventionKind, machineId, maintenanceOrders, resetPreventiveTasks],
  );

  const onOrderChange = (orderId: string) => {
    applyOrder(orderId, true);
  };

  const onMachineChange = (nextMachineId: string) => {
    setMachineId(nextMachineId);
    if (interventionKind === "PREVENTIVE") applyLinePrefill(selectedOrder, nextMachineId);
  };

  const setKind = (kind: "PREVENTIVE" | "CORRECTIVE") => {
    setInterventionKind(kind);
    if (kind === "PREVENTIVE") {
      setOperationType("CONTROLE");
      applyOrder(selectedOrderId, false, "PREVENTIVE");
    } else {
      setOperationType("DIAGNOSTIC");
      setMaintenanceOrderLineId("");
      resetPreventiveTasks();
    }
  };

  const filteredOrders = React.useMemo(() => {
    return maintenanceOrders.filter((o) => {
      if (omDateFilter) {
        const key = o.dayKey ?? calendarDayKey(new Date(o.plannedDate));
        if (key !== omDateFilter) return false;
      }
      if (omMachineFilter && !o.lines.some((l) => l.machineId === omMachineFilter)) return false;
      return true;
    });
  }, [maintenanceOrders, omDateFilter, omMachineFilter]);

  const omOptions = React.useMemo(() => {
    const listed = new Set(filteredOrders.map((o) => o.id));
    const extra = selectedOrder && !listed.has(selectedOrder.id) ? [selectedOrder] : [];
    return [
      {
        value: "__none__",
        label: "Aucun — OM du jour lié automatiquement à l’enregistrement",
        description: "Saisie libre",
      },
      ...[...filteredOrders, ...extra].map((o) => {
        const { label, description } = omSearchLabel(o);
        return { value: o.id, label, description };
      }),
    ];
  }, [filteredOrders, selectedOrder]);

  React.useEffect(() => {
    if (omPickedByUser.current) return;
    const dayKey = dayKeyFromInput(dateValue);
    if (!dayKey) return;
    const match =
      maintenanceOrders.find((o) => o.dayKey === dayKey || o.reference === `OM-${dayKey}`) ??
      maintenanceOrders.find((o) => calendarDayKey(new Date(o.plannedDate)) === dayKey);
    if (match) {
      if (selectedOrderId !== match.id) applyOrder(match.id, false);
    }
  }, [applyOrder, dateValue, maintenanceOrders, selectedOrderId]);

  const onSubmit = (formData: FormData) => {
    setMessage(null);
    const filtered = lines
      .map((l) => ({ sparePartId: l.partId.trim(), quantity: Math.floor(Number(l.quantity)) }))
      .filter((l) => l.sparePartId.length > 0 && l.quantity > 0);

    formData.set("signature", signatureDataUrl);
    formData.set("photoBefore", photoBeforeUrl);
    formData.set("photoAfter", photoAfterUrl);
    formData.set("linesJson", JSON.stringify(filtered));
    if (maintenanceOrderLineId) formData.set("maintenanceOrderLineId", maintenanceOrderLineId);
    if (interventionKind === "PREVENTIVE") {
      if (preventiveCleaning) formData.set("preventiveCleaning", "on");
      if (preventiveLubrication) formData.set("preventiveLubrication", "on");
      if (preventiveOil) formData.set("preventiveOil", "on");
      if (preventiveControl) formData.set("preventiveControl", "on");
      if (preventiveNonConforme) formData.set("preventiveNonConforme", "on");
    }

    startTransition(async () => {
      const result = await createMaintenanceLogWithParts(formData);
      if (result.ok) {
        setCreatedId(result.id);
        if (result.om) {
          dispatchOmNotice({
            created: result.om.created,
            reference: result.om.reference,
            dayKey: result.om.dayKey,
          });
        }
        setMessage({
          kind: "ok",
          text: result.om
            ? result.om.created
              ? `Intervention enregistrée. Ordre ${result.om.reference} créé pour cette date.`
              : `Intervention enregistrée et rattachée à l'ordre ${result.om.reference}.`
            : `Intervention enregistrée.${maintenanceOrderLineId ? " L'ordre de maintenance associé a été clôturé si toutes les lignes sont réalisées." : ""}`,
        });
        setSignatureDataUrl("");
        setSigReset((k) => k + 1);
        setPhotoBeforeUrl("");
        setPhotoAfterUrl("");
        setLines([{ partId: "", quantity: 1 }]);
        setSelectedOrderId("");
        setMachineId("");
        setMaintenanceOrderLineId("");
        setInterventionKind("PREVENTIVE");
        setOperationType("CONTROLE");
        setDateValue(localNowForInput());
        setOmDateFilter(localNowForInput().slice(0, 10));
        setOmMachineFilter("");
        omPickedByUser.current = false;
        setPreventiveCleaning(false);
        setPreventiveLubrication(false);
        setPreventiveOil(false);
        setPreventiveControl(false);
        setPreventiveNonConforme(false);
      } else {
        setMessage({ kind: "err", text: result.error });
      }
    });
  };

  return (
    <form action={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Identification</CardTitle>
          <CardDescription>Type, date et ordre de maintenance — le n° d’OM est identifié automatiquement</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="workflowStatus" value="COMPLETED" />
          <div className="space-y-2 sm:col-span-2">
            <Label>Type de maintenance *</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setKind("PREVENTIVE")}
                className={cn(
                  "rounded-xl border px-3 py-3 text-sm font-semibold transition",
                  interventionKind === "PREVENTIVE"
                    ? "border-[#1F76FB] bg-[#E8F1FF] text-[#0B2A5B]"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                )}
              >
                Préventive
              </button>
              <button
                type="button"
                onClick={() => setKind("CORRECTIVE")}
                className={cn(
                  "rounded-xl border px-3 py-3 text-sm font-semibold transition",
                  interventionKind === "CORRECTIVE"
                    ? "border-amber-400 bg-amber-50 text-amber-900"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                )}
              >
                Corrective
              </button>
            </div>
            <p className="text-xs text-slate-500">
              {interventionKind === "PREVENTIVE"
                ? "L’OM du planning préventif pré-remplit la machine et les tâches prévues."
                : "L’intervention sera rattachée à l’OM journalier de la date choisie."}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date / heure *</Label>
            <Input
              id="date"
              name="date"
              type="datetime-local"
              required
              value={dateValue}
              onChange={(e) => {
                omPickedByUser.current = false;
                setDateValue(e.target.value);
                const key = dayKeyFromInput(e.target.value);
                if (key) setOmDateFilter(key);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="om-date-filter">Filtrer les OM par date</Label>
            <Input
              id="om-date-filter"
              type="date"
              value={omDateFilter}
              onChange={(e) => setOmDateFilter(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="om-machine-filter">Filtrer les OM par machine</Label>
            <SearchableVirtualSelect
              id="om-machine-filter"
              value={omMachineFilter}
              onValueChange={setOmMachineFilter}
              options={[{ value: "", label: "Toutes les machines" }, ...allMachineOptions]}
              placeholder="Rechercher une machine du planning…"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="maintenanceOrderId">N° d’ordre de maintenance</Label>
            <SearchableVirtualSelect
              id="maintenanceOrderId"
              value={selectedOrderId || "__none__"}
              onValueChange={(v) => onOrderChange(v === "__none__" ? "" : v)}
              options={omOptions}
              placeholder="Rechercher par n°, date ou machine…"
            />
            {selectedOrder ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <p className="font-semibold text-slate-900">{selectedOrder.reference}</p>
                <p className="text-xs text-slate-600">
                  {formatDateFrShort(selectedOrder.plannedDate)}
                  {selectedOrder.lines.length
                    ? ` · ${selectedOrder.lines.length} maintenance(s) préventive(s) ouverte(s)`
                    : " · OM journalier"}
                </p>
                {selectedOrder.lines.length ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {selectedOrder.lines.map((l) => (
                      <Badge
                        key={l.lineId}
                        variant={machineId === l.machineId ? "default" : "secondary"}
                        className="text-[10px] font-normal"
                      >
                        {l.machineName}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Choisissez une date : le n° {dayKeyFromInput(dateValue) ? `OM-${dayKeyFromInput(dateValue)}` : "OM-AAAA-MM-JJ"} est
                associé automatiquement.
              </p>
            )}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="machineId">Machine *</Label>
            <SearchableVirtualSelect
              id="machineId"
              name="machineId"
              required
              value={machineId}
              onValueChange={onMachineChange}
              options={machineOptions}
              placeholder="Rechercher une machine…"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="technicianId">Technicien / intervenant *</Label>
            <SearchableVirtualSelect
              id="technicianId"
              name="technicianId"
              required
              value={lockedTechnicianId ?? technicianId}
              onValueChange={setTechnicianId}
              options={technicianOptions}
              placeholder="Rechercher un intervenant…"
              disabled={Boolean(lockedTechnicianId)}
            />
            {lockedTechnicianId ? (
              <p className="text-xs text-muted-foreground">Profil verrouillé — vous ne pouvez créer des fiches qu&apos;à votre nom.</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="operationType">Type d&apos;opération *</Label>
            <select
              id="operationType"
              name="operationType"
              required
              value={operationType}
              onChange={(e) => setOperationType(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {interventionKind === "PREVENTIVE" ? (
                <option value="CONTROLE">Contrôle (préventif)</option>
              ) : (
                <>
                  <option value="DIAGNOSTIC">Diagnostic</option>
                  <option value="REMPLACEMENT">Remplacement</option>
                  <option value="AMELIORATION">Amélioration</option>
                </>
              )}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="durationMinutes">Durée (min)</Label>
            <Input id="durationMinutes" name="durationMinutes" type="number" min={0} step={1} placeholder="Ex. 45" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="failureCause">Cause de défaillance</Label>
            <select
              id="failureCause"
              name="failureCause"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              defaultValue=""
            >
              <option value="">—</option>
              <option value="USURE_NORMALE">Usure normale</option>
              <option value="DEFAUT_UTILISATEUR">Défaut utilisateur</option>
              <option value="DEFAUT_PRODUIT">Défaut produit</option>
              <option value="AUTRE">Autre</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contexte terrain</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sectorMaintenance">Secteur maintenance</Label>
            <Input id="sectorMaintenance" name="sectorMaintenance" autoComplete="off" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="service">Service</Label>
            <Input id="service" name="service" autoComplete="off" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="operation">Opération</Label>
            <Input id="operation" name="operation" autoComplete="off" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rapport</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="failureDescription">Description dysfonctionnement</Label>
            <Textarea id="failureDescription" name="failureDescription" rows={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="workPerformed">Travaux réalisés *</Label>
            <Textarea id="workPerformed" name="workPerformed" required rows={5} placeholder="Rapport d'intervention…" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="difficulties">Difficultés rencontrées</Label>
            <Textarea id="difficulties" name="difficulties" rows={3} />
          </div>

          {interventionKind === "PREVENTIVE" ? (
            <div className="rounded-lg border border-dashed p-3">
              <p className="mb-3 text-sm font-medium">Tâches préventives prévues</p>
              <p className="mb-3 text-xs text-slate-500">
                Pré-remplies depuis l’OM de planning si une machine planifiée est sélectionnée.
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={preventiveCleaning}
                    onChange={(e) => setPreventiveCleaning(e.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  Nettoyage
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={preventiveLubrication}
                    onChange={(e) => setPreventiveLubrication(e.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  Graissage
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={preventiveOil}
                    onChange={(e) => setPreventiveOil(e.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  Huile
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={preventiveControl}
                    onChange={(e) => setPreventiveControl(e.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  Contrôle / C
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={preventiveNonConforme}
                    onChange={(e) => setPreventiveNonConforme(e.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  Non conforme / N.C
                </label>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pièces de rechange utilisées</CardTitle>
          <CardDescription>
            Recherche optimisée dans le stock. À la validation, un mouvement SORTIE est enregistré et le stock global
            est décrémenté. Signature tactile obligatoire si au moins une pièce est consommée.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {lines.map((row, idx) => {
            const usedElsewhere = new Set(lines.filter((_, i) => i !== idx && lines[i]!.partId).map((l) => l.partId));
            return (
              <div key={idx} className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                <div className="space-y-2">
                  <Label htmlFor={`part-${idx}`}>Pièce du stock</Label>
                  <SparePartSearchSelect
                    parts={spareParts}
                    value={row.partId}
                    onValueChange={(id) =>
                      setLines((prev) => prev.map((p, i) => (i === idx ? { ...p, partId: id } : p)))
                    }
                    excludeIds={usedElsewhere}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`qty-${idx}`}>Quantité utilisée</Label>
                  <Input
                    id={`qty-${idx}`}
                    type="number"
                    min={1}
                    step={1}
                    value={row.quantity}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((p, i) => (i === idx ? { ...p, quantity: Math.max(1, Number(e.target.value) || 1) } : p)),
                      )
                    }
                  />
                </div>
                <div className="flex gap-2 sm:justify-end">
                  {lines.length > 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      Retirer
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
          <Button type="button" variant="secondary" size="sm" onClick={() => setLines((prev) => [...prev, { partId: "", quantity: 1 }])}>
            Ajouter une pièce
          </Button>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Les étiquettes de stock reflètent l&apos;état au chargement de la page. En cas de conflit temps réel avec un
            autre poste, le serveur refusera la transaction si la quantité n&apos;est plus disponible.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preuves visuelles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <TouchSignaturePad key={`pad-${sigReset}`} value={signatureDataUrl} onChange={setSignatureDataUrl} />

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="photoBeforeFile">Photo avant</Label>
              <Input
                id="photoBeforeFile"
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) {
                    setPhotoBeforeUrl("");
                    return;
                  }
                  const url = await readImageFile(f, 900);
                  setPhotoBeforeUrl(url ?? "");
                  if (!url) setMessage({ kind: "err", text: "Photo avant : image requise, taille max. ~900 Ko." });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="photoAfterFile">Photo après</Label>
              <Input
                id="photoAfterFile"
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) {
                    setPhotoAfterUrl("");
                    return;
                  }
                  const url = await readImageFile(f, 900);
                  setPhotoAfterUrl(url ?? "");
                  if (!url) setMessage({ kind: "err", text: "Photo après : image requise, taille max. ~900 Ko." });
                }}
              />
            </div>
          </div>

          {(photoBeforeUrl || photoAfterUrl) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {photoBeforeUrl ? (
                <figure className="space-y-1">
                  <figcaption className="text-xs text-muted-foreground">Aperçu avant</figcaption>
                  {/* next/image incompatible avec data-URL hors domaine configuré */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoBeforeUrl} alt="Avant intervention" className="max-h-40 rounded-md border object-contain" />
                </figure>
              ) : null}
              {photoAfterUrl ? (
                <figure className="space-y-1">
                  <figcaption className="text-xs text-muted-foreground">Aperçu après</figcaption>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoAfterUrl} alt="Après intervention" className="max-h-40 rounded-md border object-contain" />
                </figure>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {message ? (
        <div
          className={
            message.kind === "ok"
              ? "space-y-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900"
              : "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
        >
          <p>{message.text}</p>
          {message.kind === "ok" && createdId ? (
            <InterventionFicheButton interventionId={createdId} label="Télécharger la fiche PDF" />
          ) : null}
        </div>
      ) : null}

      <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
        {pending ? "Enregistrement…" : "Valider intervention & déstocker"}
      </Button>
    </form>
  );
}
