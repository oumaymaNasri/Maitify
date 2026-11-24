import { AlertTriangle, DatabaseBackup } from "lucide-react";

import { PERSISTENCE_DISABLED_MESSAGE } from "@/lib/preventive/persistence";

export function PersistenceBanner({ ready }: { ready: boolean }) {
  if (ready) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <DatabaseBackup className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>
          Persistance PostgreSQL active. Les écritures (création, modification, activation) sont
          autorisées pour les profils Directeur / Administrateur.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="space-y-1">
        <p className="font-semibold">Écritures désactivées</p>
        <p>{PERSISTENCE_DISABLED_MESSAGE}</p>
        <p className="text-amber-800">
          Aucune donnée fictive n&apos;est présentée comme plan réel. La prévisualisation utilise le
          moteur Lot 2 en mémoire uniquement.
        </p>
      </div>
    </div>
  );
}
