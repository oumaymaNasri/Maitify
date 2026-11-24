import Link from "next/link";
import { notFound } from "next/navigation";

import { PersistenceBanner } from "@/components/preventive-planning/persistence-banner";
import { PreventivePlanForm } from "@/components/preventive-planning/plan-form";
import { PreventivePreviewPanel } from "@/components/preventive-planning/preview-panel";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { DbErrorHint } from "@/components/layout/DbError";
import { canManage } from "@/lib/auth/session";
import { getSession } from "@/lib/auth/session-server";
import {
  loadPreventivePlanDetail,
  loadPreventivePlanningPageData,
} from "@/lib/preventive/plans-query";
import {
  preventiveFrequencyFr,
  preventivePlanStatusFr,
  preventiveScheduleModeFr,
  sundayPolicyFr,
} from "@/lib/preventive/labels";
import type { PreventivePlanFormValues } from "@/lib/preventive/preview-adapter";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
  searchParams?: { edit?: string; preview?: string };
};

export default async function PreventivePlanDetailPage({ params, searchParams }: PageProps) {
  try {
    const session = getSession();
    const canWrite = session ? canManage(session) : false;
    const [{ persistenceReady, plan }, pageData] = await Promise.all([
      loadPreventivePlanDetail(params.id),
      loadPreventivePlanningPageData(),
    ]);

    if (!persistenceReady) {
      return (
        <div className="gmao-module-page density-page-inner mx-auto max-w-3xl space-y-4">
          <PersistenceBanner ready={false} />
          <p className="text-sm text-slate-600">
            Impossible d&apos;afficher un plan persisté : les tables Lot 1 ne sont pas disponibles.
            Utilisez <Link className="text-[#1F76FB] underline" href="/preventive-planning/new">Nouveau plan</Link>{" "}
            pour une configuration + prévisualisation sans sauvegarde.
          </p>
          <ButtonLink href="/preventive-planning" variant="outline">
            Retour
          </ButtonLink>
        </div>
      );
    }

    if (!plan) notFound();

    const editMode = searchParams?.edit === "1";
    const focusPreview = searchParams?.preview === "1";

    const formInitial = {
      machineId: plan.machineId,
      maintenanceTypeId: plan.maintenanceTypeId,
      title: plan.title,
      description: plan.description ?? "",
      instructions: plan.instructions ?? "",
      frequency: plan.frequency,
      occurrencesPerPeriod: plan.occurrencesPerPeriod,
      scheduleMode: plan.scheduleMode,
      includeSunday: plan.includeSunday,
      sundayPolicy: plan.sundayPolicy,
      startDate: plan.startDate.toISOString().slice(0, 10),
      endDate: plan.endDate ? plan.endDate.toISOString().slice(0, 10) : "",
      estimatedDurationMin: plan.estimatedDurationMin ?? undefined,
      assigneeTechnicianId: plan.assigneeTechnicianId ?? "",
      status: plan.status,
      defaultTimes: plan.defaultTimes,
      scheduleRules: plan.scheduleRules.map((r) => ({
        sortOrder: r.sortOrder,
        weekday: r.weekday,
        monthDay: r.monthDay,
        month: r.month,
        timeLocal: r.timeLocal,
      })),
    };

    const previewValues: PreventivePlanFormValues = {
      planId: plan.id,
      planVersion: plan.version,
      machineId: plan.machineId,
      maintenanceTypeId: plan.maintenanceTypeId,
      title: plan.title,
      frequency: plan.frequency,
      occurrencesPerPeriod: plan.occurrencesPerPeriod,
      scheduleMode: plan.scheduleMode,
      includeSunday: plan.includeSunday,
      sundayPolicy: plan.sundayPolicy,
      startDate: formInitial.startDate,
      endDate: formInitial.endDate || null,
      status: plan.status,
      defaultTimes: plan.defaultTimes,
      scheduleRules: formInitial.scheduleRules,
      estimatedDurationMin: plan.estimatedDurationMin,
    };

    if (editMode) {
      return (
        <div className="gmao-module-page density-page-inner mx-auto max-w-5xl space-y-4">
          <PersistenceBanner ready={persistenceReady} />
          <h1 className="text-xl font-semibold text-slate-900">Modifier — {plan.title}</h1>
          <PreventivePlanForm
            mode="edit"
            planId={plan.id}
            persistenceReady={persistenceReady}
            canWrite={canWrite}
            machines={pageData.machines}
            technicians={pageData.technicians}
            maintenanceTypes={pageData.maintenanceTypes}
            initial={formInitial}
          />
        </div>
      );
    }

    return (
      <div className="gmao-module-page density-page-inner mx-auto max-w-5xl space-y-4">
        <PersistenceBanner ready={persistenceReady} />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{plan.title}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {plan.machine.name} · {plan.maintenanceType.label} · v{plan.version}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/preventive-planning" variant="outline">
              Liste
            </ButtonLink>
            <ButtonLink href={`/preventive-planning/${plan.id}?edit=1`} variant="outline">
              Modifier
            </ButtonLink>
          </div>
        </div>

        <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm md:grid-cols-2">
          <p>
            <span className="text-slate-500">Fréquence :</span> {preventiveFrequencyFr(plan.frequency)} ×
            {plan.occurrencesPerPeriod}
          </p>
          <p>
            <span className="text-slate-500">Mode :</span> {preventiveScheduleModeFr(plan.scheduleMode)}
          </p>
          <p>
            <span className="text-slate-500">Dimanche :</span>{" "}
            {plan.includeSunday ? "Inclus" : `Exclu — ${sundayPolicyFr(plan.sundayPolicy)}`}
          </p>
          <p>
            <span className="text-slate-500">Statut :</span>{" "}
            <Badge variant={plan.status === "ACTIVE" ? "success" : "secondary"}>
              {preventivePlanStatusFr(plan.status)}
            </Badge>
          </p>
          <p>
            <span className="text-slate-500">Début :</span> {formInitial.startDate}
          </p>
          <p>
            <span className="text-slate-500">Fin :</span> {formInitial.endDate || "—"}
          </p>
          <p className="md:col-span-2">
            <span className="text-slate-500">Instructions :</span> {plan.instructions || "—"}
          </p>
        </div>

        <div className={focusPreview ? "ring-2 ring-[#1F76FB] rounded-xl" : undefined}>
          <PreventivePreviewPanel values={previewValues} maintenanceTypeLabel={plan.maintenanceType.label} />
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Historique des révisions</h2>
          {plan.revisions.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Aucune révision enregistrée.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {plan.revisions.map((r) => (
                <li key={r.id} className="rounded-lg border border-slate-100 px-3 py-2">
                  <p className="font-medium">
                    v{r.version} — {r.changeSummary || "Modification"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {r.changedAt.toISOString().slice(0, 19).replace("T", " ")}
                    {r.changedBy?.name ? ` · ${r.changedBy.name}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  } catch (e) {
    return (
      <div className="gmao-module-page density-page-inner py-8">
        <DbErrorHint detail={e instanceof Error ? e.message : String(e)} />
      </div>
    );
  }
}
