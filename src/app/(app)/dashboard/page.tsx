import { Suspense } from "react";
import { redirect } from "next/navigation";

import { PremiumDashboard } from "@/components/dashboard/premium/premium-dashboard";
import { TechnicianDashboard } from "@/components/dashboard/premium/technician-dashboard";
import { DashboardPremiumSkeleton } from "@/components/dashboard/premium/dashboard-premium-skeleton";
import { DbErrorHint } from "@/components/layout/DbError";
import { getTechnicianDashboardDataCached } from "@/lib/gmao/dashboard-technician-data";
import { getPremiumDashboardDataCached } from "@/lib/gmao/dashboard-premium-data";
import { getSession } from "@/lib/auth/session-server";

async function DashboardContent() {
  const session = getSession();
  if (!session) redirect("/");

  try {
    if (session.role === "TECHNICIEN") {
      if (!session.technicianId) {
        return (
          <div className="max-w-3xl p-6">
            <h1 className="text-2xl font-bold text-slate-900">Tableau de bord terrain</h1>
            <DbErrorHint detail="Profil technicien non lié. Exécutez npm run db:seed:users puis reconnectez-vous." />
          </div>
        );
      }
      const data = await getTechnicianDashboardDataCached(session.technicianId);
      return <TechnicianDashboard data={data} user={session} />;
    }

    const data = await getPremiumDashboardDataCached();
    return <PremiumDashboard data={data} />;
  } catch (e) {
    return (
      <div className="max-w-3xl p-6">
        <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
        <DbErrorHint detail={e instanceof Error ? e.message : String(e)} />
      </div>
    );
  }
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardPremiumSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
