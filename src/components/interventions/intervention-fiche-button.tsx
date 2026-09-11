"use client";

import { FileDown, Loader2 } from "lucide-react";
import * as React from "react";

import { getMaintenanceLogDetailAction } from "@/app/actions/maintenance-log";
import { Button } from "@/components/ui/button";
import { openInterventionFichePrint } from "@/lib/export/intervention-fiche-html";
import { cn } from "@/lib/utils";

type InterventionFicheButtonProps = {
  interventionId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
  className?: string;
  label?: string;
  machineName?: string;
  /** true = téléchargement via API ; false = impression locale */
  useApi?: boolean;
};

export function InterventionFicheButton({
  interventionId,
  variant = "outline",
  size = "sm",
  className,
  label = "Télécharger la fiche PDF",
  machineName,
  useApi = true,
}: InterventionFicheButtonProps) {
  const [pending, setPending] = React.useState(false);

  const safeMachine = (machineName ?? "machine")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const fileName = `Fiche_Intervention_${safeMachine || interventionId.slice(0, 8)}.pdf`;
  const href = `/api/interventions/${encodeURIComponent(interventionId)}/fiche`;

  if (useApi) {
    if (size === "icon") {
      return (
        <a
          href={href}
          download={fileName}
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-[#1F76FB]",
            className,
          )}
          aria-label={label}
          title={label}
        >
          <FileDown className="h-4 w-4" />
        </a>
      );
    }

    return (
      <a
        href={href}
        download={fileName}
        className={cn(
          "inline-flex items-center justify-center rounded-xl border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
          className,
        )}
      >
        <FileDown className="mr-2 h-4 w-4" />
        {label}
      </a>
    );
  }

  const onClick = async () => {
    setPending(true);
    const res = await getMaintenanceLogDetailAction(interventionId);
    setPending(false);
    if (res.ok) openInterventionFichePrint(res.data);
  };

  if (size === "icon") {
    return (
      <Button
        type="button"
        variant={variant}
        size="icon"
        className={cn("h-8 w-8 rounded-xl", className)}
        disabled={pending}
        onClick={onClick}
        aria-label={label}
        title={label}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("rounded-xl", className)}
      disabled={pending}
      onClick={onClick}
    >
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
      {label}
    </Button>
  );
}
