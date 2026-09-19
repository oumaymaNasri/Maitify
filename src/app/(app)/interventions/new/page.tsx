import { redirect } from "next/navigation";

import { InterventionIntelligentForm } from "@/components/interventions/InterventionIntelligentForm";
import { DbErrorHint } from "@/components/layout/DbError";
import { ButtonLink } from "@/components/ui/button";
import { fetchActiveMaintenanceOrders } from "@/lib/gmao/maintenance-orders-query";
import { getInterventionMachineOptionsCached, getInterventionTechnicianOptionsCached } from "@/lib/gmao/interventions-query";
import { getSession } from "@/lib/auth/session-server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function NewInterventionPage() {
  const session = getSession();
  if (!session) redirect("/");

  const isTechnician = session.role === "TECHNICIEN";
  const lockedTechnicianId = isTechnician ? session.technicianId : null;

  if (isTechnician && !lockedTechnicianId) {
    return (
      <div className="gmao-module-page density-page-inner py-8">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Nouvelle intervention</h1>
        <DbErrorHint detail="Profil technicien non lié. Exécutez npm run db:seed:users puis reconnectez-vous." />
      </div>
    );
  }

  let machines: { id: string; name: string; legacyMatricule: number | null }[] = [];
  let technicians: { id: string; label: string; availability: string }[] = [];
  let spareParts: { id: string; designation: string; reference: string | null; quantity: number; minStock: number }[] = [];
  let maintenanceOrders: Awaited<ReturnType<typeof fetchActiveMaintenanceOrders>> = [];
  let err: string | undefined;

  try {
    const [machineRows, techRows, partRows, orderRows] = await Promise.all([
      getInterventionMachineOptionsCached(),
      lockedTechnicianId
        ? getInterventionTechnicianOptionsCached().then((rows) => rows.filter((t) => t.id === lockedTechnicianId))
        : getInterventionTechnicianOptionsCached(),
      isTechnician
        ? Promise.resolve([])
        : prisma.sparePart.findMany({
            take: 100,
            orderBy: { designation: "asc" },
            select: { id: true, designation: true, reference: true, quantity: true, minStock: true },
          }),
      fetchActiveMaintenanceOrders(),
    ]);
    machines = machineRows;
    technicians = techRows.map((t) => ({
      id: t.id,
      label: `${t.firstName} ${t.lastName}`,
      availability: t.availability,
    }));
    spareParts = partRows;
    maintenanceOrders = orderRows;
  } catch (e) {
    err = e instanceof Error ? e.message : String(e);
  }

  if (err) {
    return (
      <div className="gmao-module-page density-page-inner py-8">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Nouvelle intervention</h1>
        <DbErrorHint detail={err} />
      </div>
    );
  }

  return (
    <div className="gmao-module-page density-page-inner">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex justify-end">
          <ButtonLink href="/interventions" variant="outline" size="sm" className="shrink-0">
            Retour liste
          </ButtonLink>
        </div>

        {machines.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Aucune machine — créez le parc dans la liste des machines.
          </p>
        ) : technicians.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Aucun technicien — ajoutez des profils dans la liste des Techniciens.
          </p>
        ) : (
          <InterventionIntelligentForm
            machines={machines}
            technicians={technicians}
            spareParts={spareParts}
            maintenanceOrders={maintenanceOrders}
            lockedTechnicianId={lockedTechnicianId ?? undefined}
          />
        )}
      </div>
    </div>
  );
}
