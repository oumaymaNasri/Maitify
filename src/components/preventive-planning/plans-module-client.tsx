"use client";

import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  Eye,
  LayoutGrid,
  LayoutList,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  User,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { generatePreventiveOrdersAction, setPreventivePlanStatusAction } from "@/app/actions/preventive-plan";
import type { MachineOption } from "@/components/preventive-planning/machine-combobox";
import { PersistenceBanner } from "@/components/preventive-planning/persistence-banner";
import { PreventivePlanDialog, type PlanDialogState } from "@/components/preventive-planning/plan-dialog";
import { PreventivePlansCalendar } from "@/components/preventive-planning/plans-calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MaintenanceTypeOption } from "@/lib/preventive/catalog";
import { preventiveFrequencyFr, preventivePlanStatusFr, sundayPolicyFr } from "@/lib/preventive/labels";
import type { PreventivePlanListItem } from "@/lib/preventive/plans-query";
import { cn } from "@/lib/utils";

type ViewMode = "list" | "cards" | "calendar";
const VIEW_KEY = "gmao.preventive.view";

function formatDateFr(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

function frequencyText(p: PreventivePlanListItem) {
  return `${preventiveFrequencyFr(p.frequency)}${p.occurrencesPerPeriod > 1 ? ` · ${p.occurrencesPerPeriod}×` : ""}`;
}

function sundayText(p: PreventivePlanListItem) {
  return p.includeSunday ? "Dimanche travaillé" : sundayPolicyFr(p.sundayPolicy);
}

function StatusBadge({ status }: { status: PreventivePlanListItem["status"] }) {
  return (
    <Badge
      className={cn(
        "font-medium",
        status === "ACTIVE"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-100 text-slate-600",
      )}
    >
      {preventivePlanStatusFr(status)}
    </Badge>
  );
}

function OverdueBadge({ count }: { count: number }) {
  if (count === 0) return <span className="text-slate-400">0</span>;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
      <AlertTriangle className="h-3 w-3" />
      {count}
    </span>
  );
}

export function PreventivePlansModuleClient({
  persistenceReady,
  canWrite,
  plans,
  machines,
  technicians,
  maintenanceTypes,
}: {
  persistenceReady: boolean;
  canWrite: boolean;
  plans: PreventivePlanListItem[];
  machines: MachineOption[];
  technicians: { id: string; label: string }[];
  maintenanceTypes: MaintenanceTypeOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = React.useState("");
  const [machineId, setMachineId] = React.useState("ALL");
  const [typeId, setTypeId] = React.useState("ALL");
  const [frequency, setFrequency] = React.useState("ALL");
  const [status, setStatus] = React.useState("ACTIVE");
  const [view, setView] = React.useState<ViewMode>("list");
  const [message, setMessage] = React.useState<{ kind: "error" | "info"; text: string } | null>(null);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [generating, startGenerate] = React.useTransition();
  const [dialog, setDialog] = React.useState<PlanDialogState>(null);

  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(VIEW_KEY);
      if (saved === "list" || saved === "cards" || saved === "calendar") setView(saved);
    } catch {
      /* stockage indisponible */
    }
  }, []);
  const changeView = (v: ViewMode) => {
    setView(v);
    try {
      window.localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* ignore */
    }
  };

  // Ouverture du modal depuis une fiche machine : ?new=1&machineId=… ou ?edit=<planId>
  React.useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId) {
      const plan = plans.find((p) => p.id === editId);
      if (plan) setDialog({ mode: "edit", planId: plan.id, initial: plan.formInitial });
      return;
    }
    if (searchParams.get("new") === "1") {
      setDialog({ mode: "create", machineId: searchParams.get("machineId") ?? undefined });
    }
  }, [searchParams, plans]);

  const closeDialog = (open: boolean) => {
    if (open) return;
    setDialog(null);
    if (searchParams.get("new") || searchParams.get("edit")) router.replace(pathname, { scroll: false });
  };

  const openEdit = (p: PreventivePlanListItem) => setDialog({ mode: "edit", planId: p.id, initial: p.formInitial });

  const filtered = plans.filter((p) => {
    if (machineId !== "ALL" && p.machineId !== machineId) return false;
    if (typeId !== "ALL" && p.maintenanceTypeId !== typeId) return false;
    if (frequency !== "ALL" && p.frequency !== frequency) return false;
    if (status !== "ALL" && p.status !== status) return false;
    if (q.trim()) {
      const hay = `${p.code} ${p.title} ${p.machineName} ${p.maintenanceTypeLabel} ${p.assigneeName ?? ""}`.toLowerCase();
      if (!hay.includes(q.trim().toLowerCase())) return false;
    }
    return true;
  });

  const activeCount = plans.filter((p) => p.status === "ACTIVE").length;
  const overdueTotal = plans.reduce((s, p) => s + p.overdueCount, 0);
  const machinesCovered = new Set(plans.filter((p) => p.status === "ACTIVE").map((p) => p.machineId)).size;

  const toggleStatus = async (plan: PreventivePlanListItem) => {
    setMessage(null);
    const next = plan.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setPendingId(plan.id);
    const result = await setPreventivePlanStatusAction(plan.id, next);
    setPendingId(null);
    if (!result.ok) {
      setMessage({ kind: "error", text: result.error });
      return;
    }
    if (result.warning) setMessage({ kind: "error", text: result.warning });
    router.refresh();
  };

  const generate = () => {
    setMessage(null);
    startGenerate(async () => {
      const res = await generatePreventiveOrdersAction();
      if (!res.ok) {
        setMessage({ kind: "error", text: res.error });
        return;
      }
      const r = res.result;
      setMessage({
        kind: "info",
        text: `Génération terminée : ${r.tasksCreated} tâche(s) préventive(s) ajoutée(s), ${r.ordersCreated} OM créé(s), ${r.markedOverdue} occurrence(s) passée(s) en retard.`,
      });
      router.refresh();
    });
  };

  const writesEnabled = persistenceReady && canWrite;

  const actionButtons = (p: PreventivePlanListItem) => (
    <div className="flex items-center gap-1">
      <Link
        href={`/preventive-planning/${p.id}`}
        title="Consulter"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      >
        <Eye className="h-4 w-4" />
      </Link>
      <button
        type="button"
        title="Modifier"
        onClick={() => openEdit(p)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#1F76FB] hover:bg-blue-50"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        title={p.status === "ACTIVE" ? "Désactiver" : "Activer"}
        disabled={!writesEnabled || pendingId === p.id}
        onClick={() => void toggleStatus(p)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-40"
      >
        <Power className="h-4 w-4" />
      </button>
    </div>
  );

  const viewButton = (v: ViewMode, label: string, Icon: typeof LayoutList) => (
    <button
      type="button"
      aria-pressed={view === v}
      onClick={() => changeView(v)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-xs font-semibold transition",
        view === v ? "bg-white text-[#0B2A5B] shadow-sm" : "text-slate-500 hover:text-slate-800",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );

  return (
    <div className="gmao-module-page density-page-inner space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            <CalendarClock className="h-5 w-5 text-[#1F76FB]" aria-hidden />
            Planning de maintenance préventive
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Un ou plusieurs plans par machine — les OM préventifs sont générés automatiquement aux dates calculées.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={!writesEnabled || generating} onClick={generate}>
            <RefreshCw className={cn("h-4 w-4", generating && "animate-spin")} />
            {generating ? "Génération…" : "Générer les OM"}
          </Button>
          <Button type="button" className="bg-[#1F76FB] hover:bg-[#1865D9]" onClick={() => setDialog({ mode: "create" })}>
            <Plus className="h-4 w-4" />
            Nouveau plan
          </Button>
        </div>
      </div>

      <PersistenceBanner ready={persistenceReady} />

      {message ? (
        <p
          className={cn(
            "rounded-md border px-3 py-2 text-sm",
            message.kind === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-blue-200 bg-blue-50 text-blue-800",
          )}
        >
          {message.text}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Plans actifs", value: activeCount, cls: "text-slate-900" },
          { label: "Machines couvertes", value: machinesCovered, cls: "text-slate-900" },
          { label: "Échéances en retard", value: overdueTotal, cls: overdueTotal ? "text-rose-600" : "text-slate-900" },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium text-slate-500">{k.label}</p>
            <p className={cn("text-2xl font-semibold tabular-nums", k.cls)}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{filtered.length}</span> plan(s)
          </p>
          <div role="group" aria-label="Mode d'affichage" className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
            {viewButton("list", "Liste", LayoutList)}
            {viewButton("cards", "Cartes", LayoutGrid)}
            {viewButton("calendar", "Calendrier", CalendarDays)}
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-5">
          <Input placeholder="Rechercher un plan, une machine…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="rounded-md border border-slate-200 px-2 py-2 text-sm" value={machineId} onChange={(e) => setMachineId(e.target.value)}>
            <option value="ALL">Toutes les machines</option>
            {machines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <select className="rounded-md border border-slate-200 px-2 py-2 text-sm" value={typeId} onChange={(e) => setTypeId(e.target.value)}>
            <option value="ALL">Tous les types</option>
            {maintenanceTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <select className="rounded-md border border-slate-200 px-2 py-2 text-sm" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            <option value="ALL">Toutes les fréquences</option>
            <option value="DAILY">Journalier</option>
            <option value="WEEKLY">Hebdomadaire</option>
            <option value="MONTHLY">Mensuel</option>
            <option value="YEARLY">Annuel</option>
          </select>
          <select className="rounded-md border border-slate-200 px-2 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="ALL">Tous les statuts</option>
            <option value="ACTIVE">Actif</option>
            <option value="SUSPENDED">Inactif</option>
            <option value="ARCHIVED">Archivé</option>
          </select>
        </div>
      </div>

      {view === "calendar" ? (
        <PreventivePlansCalendar plans={filtered} onOpenPlan={openEdit} />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-800">Aucun plan à afficher</p>
          <p className="mt-1 text-sm text-slate-500">
            {persistenceReady
              ? "Aucun plan ne correspond aux filtres, ou aucun plan n'a encore été créé."
              : "La base ne contient pas encore les tables du planning préventif."}
          </p>
          <Button type="button" variant="outline" className="mt-4" onClick={() => setDialog({ mode: "create" })}>
            <Plus className="h-4 w-4" /> Créer un plan
          </Button>
        </div>
      ) : view === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <div key={p.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{p.maintenanceTypeLabel}</p>
                  <h3 className="mt-0.5 line-clamp-2 font-semibold text-slate-900">{p.title}</h3>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <dl className="mt-3 space-y-1.5 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Wrench className="h-3.5 w-3.5 text-slate-400" />
                  <span className="truncate">{p.machineName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                  {frequencyText(p)} · {sundayText(p)}
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  {p.assigneeName ?? "Non assigné"}
                </div>
              </dl>
              <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <div>
                  <p className="text-[11px] text-slate-500">Prochaine échéance</p>
                  <p className="font-medium text-slate-900">
                    {formatDateFr(p.nextOccurrenceDate)} {p.nextOccurrenceTime ?? ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-slate-500">Retards</p>
                  <OverdueBadge count={p.overdueCount} />
                </div>
              </div>
              <div className="mt-3 flex justify-end">{actionButtons(p)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="gmao-data-table min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Intitulé du plan</th>
                <th className="px-3 py-2">Machine</th>
                <th className="px-3 py-2">Type de maintenance</th>
                <th className="px-3 py-2">Fréquence</th>
                <th className="px-3 py-2">Règle dimanche</th>
                <th className="px-3 py-2">Technicien</th>
                <th className="px-3 py-2">Prochaine échéance</th>
                <th className="px-3 py-2 text-center">Retards</th>
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="max-w-[260px] px-3 py-2">
                    <p className="truncate font-medium text-slate-900">{p.title}</p>
                    <p className="font-mono text-[11px] text-slate-400">{p.code}</p>
                  </td>
                  <td className="px-3 py-2">{p.machineName}</td>
                  <td className="px-3 py-2">{p.maintenanceTypeLabel}</td>
                  <td className="whitespace-nowrap px-3 py-2">{frequencyText(p)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{sundayText(p)}</td>
                  <td className="px-3 py-2">{p.assigneeName ?? <span className="text-slate-400">—</span>}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {formatDateFr(p.nextOccurrenceDate)} <span className="tabular-nums text-slate-500">{p.nextOccurrenceTime ?? ""}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <OverdueBadge count={p.overdueCount} />
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-3 py-2">{actionButtons(p)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PreventivePlanDialog
        state={dialog}
        onOpenChange={closeDialog}
        onSaved={(_id, warning) => {
          closeDialog(false);
          setMessage(
            warning
              ? { kind: "error", text: warning }
              : { kind: "info", text: "Plan enregistré — les OM préventifs ont été générés pour les prochains jours." },
          );
          router.refresh();
        }}
        persistenceReady={persistenceReady}
        canWrite={canWrite}
        machines={machines}
        technicians={technicians}
        maintenanceTypes={maintenanceTypes}
      />
    </div>
  );
}
