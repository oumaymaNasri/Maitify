"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  PreventiveFrequency,
  PreventivePlanStatus,
  PreventiveScheduleMode,
  SundayReschedulePolicy,
} from "@prisma/client";
import * as React from "react";
import { useFieldArray, useForm, useWatch, type Resolver } from "react-hook-form";
import { z } from "zod";

import { createPreventivePlanAction, updatePreventivePlanAction } from "@/app/actions/preventive-plan";
import { MachineCombobox, type MachineOption } from "@/components/preventive-planning/machine-combobox";
import { PreventivePreviewPanel } from "@/components/preventive-planning/preview-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MaintenanceTypeOption } from "@/lib/preventive/catalog";
import { TIME_LOCAL_REGEX } from "@/lib/preventive/constants";
import { todayTunisApprox, type PreventivePlanFormValues } from "@/lib/preventive/preview-adapter";
import {
  preventiveFrequencyFr,
  preventiveScheduleModeFr,
  sundayPolicyFr,
} from "@/lib/preventive/labels";

const timeLocal = z.string().regex(TIME_LOCAL_REGEX, "Horaire invalide (HH:mm).");

const uiSchema = z
  .object({
    machineId: z.string().min(1, "Machine requise."),
    maintenanceTypeId: z.string().min(1, "Type de maintenance requis."),
    title: z.string().trim().min(2, "Intitulé trop court.").max(200),
    description: z.string().optional().nullable(),
    instructions: z.string().optional().nullable(),
    frequency: z.nativeEnum(PreventiveFrequency),
    occurrencesPerPeriod: z.coerce.number().int().min(1).max(366),
    scheduleMode: z.nativeEnum(PreventiveScheduleMode),
    includeSunday: z.boolean(),
    sundayPolicy: z.nativeEnum(SundayReschedulePolicy),
    startDate: z.string().min(1, "Date de début requise."),
    endDate: z.string().optional().nullable(),
    estimatedDurationMin: z.coerce.number().int().min(1).max(24 * 60).optional().nullable(),
    assigneeTechnicianId: z.string().optional().nullable(),
    status: z.nativeEnum(PreventivePlanStatus),
    defaultTimes: z.array(timeLocal),
    scheduleRules: z.array(
      z.object({
        sortOrder: z.number().int().min(0),
        weekday: z.coerce.number().int().min(1).max(7).optional().nullable(),
        monthDay: z.coerce.number().int().min(1).max(31).optional().nullable(),
        month: z.coerce.number().int().min(1).max(12).optional().nullable(),
        timeLocal,
      }),
    ),
  })
  .superRefine((data, ctx) => {
    if (data.endDate && data.startDate && data.endDate < data.startDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Date de fin invalide.", path: ["endDate"] });
    }
    if (data.scheduleMode === "FIXED" && data.scheduleRules.length !== data.occurrencesPerPeriod) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "En mode fixe, le nombre de créneaux doit égaler le nombre d'exécutions.",
        path: ["scheduleRules"],
      });
    }
    if (data.scheduleMode === "AUTOMATIC" && data.defaultTimes.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Au moins un horaire est requis.",
        path: ["defaultTimes"],
      });
    }
  });

export type PlanFormValues = z.infer<typeof uiSchema>;
type FormValues = PlanFormValues;

const WEEKDAYS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 7, label: "Dimanche" },
];

function syncRules(n: number, frequency: PreventiveFrequency, current: FormValues["scheduleRules"]) {
  return Array.from({ length: n }, (_, i) => {
    const prev = current[i];
    return {
      sortOrder: i,
      weekday: prev?.weekday ?? (frequency === "WEEKLY" ? Math.min(i + 1, 6) : null),
      monthDay: prev?.monthDay ?? (frequency === "MONTHLY" || frequency === "YEARLY" ? Math.min((i + 1) * 7, 28) : null),
      month: prev?.month ?? (frequency === "YEARLY" ? Math.min((i + 1) * 3, 12) : null),
      timeLocal: prev?.timeLocal ?? (i === 0 ? "08:00" : "14:00"),
    };
  });
}

const selectCls = "mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      {children}
    </section>
  );
}

export function PreventivePlanForm({
  persistenceReady,
  canWrite,
  mode,
  planId,
  machines,
  technicians,
  maintenanceTypes,
  initial,
  layout = "page",
  onSaved,
  onCancel,
}: {
  persistenceReady: boolean;
  canWrite: boolean;
  mode: "create" | "edit";
  planId?: string;
  machines: MachineOption[];
  technicians: { id: string; label: string }[];
  maintenanceTypes: MaintenanceTypeOption[];
  initial?: Partial<FormValues>;
  /** "modal" : formulaire à gauche, prévisualisation à droite, pied d'actions fixe. */
  layout?: "page" | "modal";
  onSaved?: (id: string, warning?: string) => void;
  onCancel?: () => void;
}) {
  const writesEnabled = persistenceReady && canWrite;
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(uiSchema) as Resolver<FormValues>,
    defaultValues: {
      machineId: initial?.machineId ?? "",
      maintenanceTypeId: initial?.maintenanceTypeId ?? maintenanceTypes[0]?.id ?? "",
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      instructions: initial?.instructions ?? "",
      frequency: initial?.frequency ?? "DAILY",
      occurrencesPerPeriod: initial?.occurrencesPerPeriod ?? 1,
      scheduleMode: initial?.scheduleMode ?? "AUTOMATIC",
      includeSunday: initial?.includeSunday ?? false,
      sundayPolicy: initial?.sundayPolicy ?? "NEXT_MONDAY",
      startDate: initial?.startDate ?? todayTunisApprox(),
      endDate: initial?.endDate ?? "",
      estimatedDurationMin: initial?.estimatedDurationMin ?? 30,
      assigneeTechnicianId: initial?.assigneeTechnicianId ?? "",
      status: initial?.status ?? "ACTIVE",
      defaultTimes: initial?.defaultTimes ?? ["08:00"],
      scheduleRules: initial?.scheduleRules ?? [{ sortOrder: 0, timeLocal: "08:00", weekday: null, monthDay: null, month: null }],
    },
  });

  const { fields, replace } = useFieldArray({ control: form.control, name: "scheduleRules" });
  const watched = useWatch({ control: form.control });
  const frequency = watched.frequency ?? "DAILY";
  const scheduleMode = watched.scheduleMode ?? "AUTOMATIC";
  const occurrencesPerPeriod = Number(watched.occurrencesPerPeriod ?? 1);
  const includeSunday = Boolean(watched.includeSunday);

  React.useEffect(() => {
    if (scheduleMode !== "FIXED") return;
    const current = form.getValues("scheduleRules") ?? [];
    if (current.length !== occurrencesPerPeriod) {
      replace(syncRules(occurrencesPerPeriod, frequency, current));
    }
  }, [occurrencesPerPeriod, frequency, scheduleMode, replace, form]);

  const selectedType = maintenanceTypes.find((t) => t.id === watched.maintenanceTypeId);
  const typeLabel = selectedType?.label;

  // Intitulé suggéré (type — machine) tant que l'utilisateur ne l'a pas saisi lui-même.
  const titleTouched = React.useRef(Boolean(initial?.title));
  React.useEffect(() => {
    if (titleTouched.current) return;
    const machine = machines.find((m) => m.id === watched.machineId);
    const suggestion = [typeLabel, machine?.name].filter(Boolean).join(" — ");
    if (suggestion) form.setValue("title", suggestion);
  }, [typeLabel, watched.machineId, machines, form]);

  React.useEffect(() => {
    if (mode === "create" && selectedType?.defaultDurationMin) {
      form.setValue("estimatedDurationMin", selectedType.defaultDurationMin);
    }
  }, [selectedType?.defaultDurationMin, mode, form]);

  const previewValues: PreventivePlanFormValues = {
    planId: planId ?? "preview-draft",
    machineId: watched.machineId ?? "",
    maintenanceTypeId: watched.maintenanceTypeId ?? "",
    title: watched.title ?? "",
    description: watched.description,
    instructions: watched.instructions,
    frequency: (watched.frequency as PreventivePlanFormValues["frequency"]) ?? "DAILY",
    occurrencesPerPeriod,
    scheduleMode: (watched.scheduleMode as PreventivePlanFormValues["scheduleMode"]) ?? "AUTOMATIC",
    includeSunday,
    sundayPolicy: (watched.sundayPolicy as PreventivePlanFormValues["sundayPolicy"]) ?? "NEXT_MONDAY",
    startDate: watched.startDate ?? todayTunisApprox(),
    endDate: watched.endDate || null,
    estimatedDurationMin: watched.estimatedDurationMin ?? null,
    assigneeTechnicianId: watched.assigneeTechnicianId || null,
    status: (watched.status as PreventivePlanFormValues["status"]) ?? "ACTIVE",
    defaultTimes: (watched.defaultTimes as string[])?.length ? (watched.defaultTimes as string[]) : ["08:00"],
    scheduleRules: (watched.scheduleRules as PreventivePlanFormValues["scheduleRules"]) ?? [],
  };

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    if (!writesEnabled) {
      setServerError(
        persistenceReady
          ? "Accès refusé : profil Directeur ou Administrateur requis."
          : "Écriture bloquée : migration Lot 1 non appliquée. Aucune sauvegarde effectuée.",
      );
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      if (mode === "edit" && planId) fd.set("id", planId);
      fd.set("machineId", values.machineId);
      fd.set("maintenanceTypeId", values.maintenanceTypeId);
      fd.set("title", values.title);
      fd.set("description", values.description ?? "");
      fd.set("instructions", values.instructions ?? "");
      fd.set("frequency", values.frequency);
      fd.set("occurrencesPerPeriod", String(values.occurrencesPerPeriod));
      fd.set("scheduleMode", values.scheduleMode);
      fd.set("includeSunday", String(values.includeSunday));
      fd.set("sundayPolicy", values.sundayPolicy);
      fd.set("startDate", values.startDate);
      if (values.endDate) fd.set("endDate", values.endDate);
      if (values.estimatedDurationMin) fd.set("estimatedDurationMin", String(values.estimatedDurationMin));
      if (values.assigneeTechnicianId) fd.set("assigneeTechnicianId", values.assigneeTechnicianId);
      fd.set("status", values.status);
      fd.set("defaultTimesJson", JSON.stringify(values.defaultTimes));
      fd.set("scheduleRulesJson", JSON.stringify(values.scheduleRules));

      const result =
        mode === "edit" ? await updatePreventivePlanAction(fd) : await createPreventivePlanAction(fd);

      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      if (onSaved) onSaved(result.id, result.warning);
      else window.location.href = `/preventive-planning/${result.id}`;
    });
  });

  const fieldError = (name: keyof FormValues) => form.formState.errors[name]?.message as string | undefined;
  const errorText = (name: keyof FormValues) =>
    fieldError(name) ? <p className="mt-1 text-xs text-rose-600">{String(fieldError(name))}</p> : null;

  const timesField = (
    <div>
      <Label>Horaire(s) d&apos;exécution</Label>
      <Input
        className="mt-1"
        placeholder="08:00 ou 08:00, 14:00"
        defaultValue={(watched.defaultTimes as string[] | undefined)?.join(", ") ?? ""}
        onChange={(e) => {
          const times = e.target.value
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);
          form.setValue("defaultTimes", times.length ? times : ["08:00"], { shouldValidate: true });
        }}
      />
      <p className="mt-1 text-xs text-slate-500">
        Les exécutions sont réparties uniformément sur la période. Plusieurs horaires : séparez-les par des virgules.
      </p>
      {errorText("defaultTimes")}
    </div>
  );

  const fixedSlots = (
    <div className="space-y-2">
      <Label>Créneaux fixes ({fields.length})</Label>
      {fields.map((field, index) => (
        <div key={field.id} className="grid grid-cols-2 gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2 md:grid-cols-4">
          <input type="hidden" {...form.register(`scheduleRules.${index}.sortOrder` as const)} value={index} />
          {frequency === "WEEKLY" ? (
            <select className="rounded-md border border-slate-200 px-2 py-1.5 text-sm" {...form.register(`scheduleRules.${index}.weekday` as const)}>
              {WEEKDAYS.filter((d) => includeSunday || d.value !== 7).map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          ) : null}
          {frequency === "MONTHLY" || frequency === "YEARLY" ? (
            <Input type="number" min={1} max={31} placeholder="Jour" {...form.register(`scheduleRules.${index}.monthDay` as const)} />
          ) : null}
          {frequency === "YEARLY" ? (
            <Input type="number" min={1} max={12} placeholder="Mois" {...form.register(`scheduleRules.${index}.month` as const)} />
          ) : null}
          <Input type="time" {...form.register(`scheduleRules.${index}.timeLocal` as const)} />
        </div>
      ))}
      {errorText("scheduleRules")}
    </div>
  );

  const formBody = (
    <div className="space-y-4">
      {!writesEnabled ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Enregistrement désactivé ({persistenceReady ? "profil Directeur / Admin requis" : "persistance indisponible"}).
          Vous pouvez configurer le plan et prévisualiser les échéances.
        </div>
      ) : null}

      <Section title="Machine & opération">
        <div>
          <Label htmlFor="machineId">Machine concernée *</Label>
          <MachineCombobox
            id="machineId"
            machines={machines}
            value={watched.machineId ?? ""}
            invalid={Boolean(fieldError("machineId"))}
            onChange={(v) => form.setValue("machineId", v, { shouldValidate: true })}
          />
          {errorText("machineId")}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label htmlFor="maintenanceTypeId">Type de maintenance *</Label>
            <select id="maintenanceTypeId" className={selectCls} {...form.register("maintenanceTypeId")}>
              {maintenanceTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                  {t.fromDatabase ? "" : " — référentiel conception"}
                </option>
              ))}
            </select>
            {errorText("maintenanceTypeId")}
          </div>
          <div>
            <Label htmlFor="title">Intitulé de l&apos;opération *</Label>
            <Input
              id="title"
              className="mt-1"
              {...form.register("title", {
                onChange: () => {
                  titleTouched.current = true;
                },
              })}
            />
            {errorText("title")}
          </div>
        </div>
        <div>
          <Label htmlFor="instructions">Instructions / consignes</Label>
          <Textarea id="instructions" className="mt-1" rows={2} {...form.register("instructions")} />
        </div>
      </Section>

      <Section title="Fréquence & planification">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Fréquence</Label>
            <select className={selectCls} {...form.register("frequency")}>
              {Object.values(PreventiveFrequency).map((f) => (
                <option key={f} value={f}>
                  {preventiveFrequencyFr(f)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Nombre d&apos;exécutions par période</Label>
            <Input type="number" min={1} max={366} className="mt-1" {...form.register("occurrencesPerPeriod")} />
          </div>
          <div className="md:col-span-2">
            <Label>Mode de planification</Label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {([PreventiveScheduleMode.AUTOMATIC, PreventiveScheduleMode.FIXED] as const).map((m) => (
                <label
                  key={m}
                  className={`flex cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-center text-sm ${
                    scheduleMode === m
                      ? "border-[#1F76FB] bg-blue-50 font-medium text-[#1F76FB]"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <input type="radio" value={m} className="sr-only" {...form.register("scheduleMode")} />
                  {preventiveScheduleModeFr(m)}
                </label>
              ))}
            </div>
          </div>
        </div>
        {scheduleMode === "AUTOMATIC" ? timesField : fixedSlots}
      </Section>

      <Section title="Jours non ouvrés">
        <label className="flex items-center gap-2 text-sm text-slate-800">
          <input type="checkbox" className="h-4 w-4" {...form.register("includeSunday")} />
          Le dimanche est travaillé pour ce plan
        </label>
        {!includeSunday ? (
          <div>
            <Label>Si l&apos;échéance tombe un dimanche</Label>
            <select className={selectCls} {...form.register("sundayPolicy")}>
              {Object.values(SundayReschedulePolicy).map((p) => (
                <option key={p} value={p}>
                  {sundayPolicyFr(p)}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </Section>

      <Section title="Période & ressources">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Date de début *</Label>
            <Input type="date" className="mt-1" {...form.register("startDate")} />
            {errorText("startDate")}
          </div>
          <div>
            <Label>Date de fin (optionnelle)</Label>
            <Input type="date" className="mt-1" {...form.register("endDate")} />
            {errorText("endDate")}
          </div>
          <div>
            <Label>Technicien responsable</Label>
            <select className={selectCls} {...form.register("assigneeTechnicianId")}>
              <option value="">Non assigné</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Durée estimée (minutes)</Label>
            <Input type="number" min={1} className="mt-1" {...form.register("estimatedDurationMin")} />
          </div>
          {mode === "edit" ? (
            <div>
              <Label>Statut</Label>
              <select className={selectCls} {...form.register("status")}>
                <option value="ACTIVE">Actif</option>
                <option value="SUSPENDED">Inactif</option>
                <option value="ARCHIVED">Archivé</option>
              </select>
            </div>
          ) : null}
        </div>
      </Section>
    </div>
  );

  const errorKeys = Object.keys(form.formState.errors) as (keyof FormValues)[];
  const FIELD_LABELS: Partial<Record<keyof FormValues, string>> = {
    machineId: "machine",
    maintenanceTypeId: "type de maintenance",
    title: "intitulé",
    occurrencesPerPeriod: "nombre d'exécutions",
    defaultTimes: "horaires",
    scheduleRules: "créneaux",
    startDate: "date de début",
    endDate: "date de fin",
    estimatedDurationMin: "durée estimée",
    assigneeTechnicianId: "technicien",
    status: "statut",
  };

  const actions = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {serverError ? (
        <p className="mr-auto rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{serverError}</p>
      ) : errorKeys.length > 0 ? (
        <p className="mr-auto rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Champs à corriger : {errorKeys.map((k) => FIELD_LABELS[k] ?? String(k)).join(", ")}.
        </p>
      ) : null}
      <Button
        type="button"
        variant="outline"
        onClick={onCancel ?? (() => (window.location.href = "/preventive-planning"))}
      >
        {onCancel ? "Annuler" : "Retour à la liste"}
      </Button>
      <Button type="submit" disabled={!writesEnabled || pending} className="bg-[#1F76FB] hover:bg-[#1865D9]">
        {pending ? "Enregistrement…" : mode === "edit" ? "Enregistrer les modifications" : "Créer le plan"}
      </Button>
    </div>
  );

  const preview = (
    <PreventivePreviewPanel values={previewValues} maintenanceTypeLabel={typeLabel} defaultHorizonDays={60} />
  );

  if (layout === "modal") {
    return (
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto lg:grid-cols-2 lg:overflow-hidden">
          <div className="min-h-0 lg:overflow-y-auto lg:pr-1">{formBody}</div>
          <div className="min-h-0 lg:overflow-y-auto">{preview}</div>
        </div>
        <div className="border-t border-slate-100 pt-3">{actions}</div>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {formBody}
        <div className="lg:sticky lg:top-4 lg:self-start">{preview}</div>
      </div>
      {actions}
    </form>
  );
}
