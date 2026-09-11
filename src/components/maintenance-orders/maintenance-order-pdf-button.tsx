"use client";

import { FileDown, Loader2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { openMaintenanceOrderPrintFromApi } from "@/lib/export/maintenance-order-html";
import { cn } from "@/lib/utils";

type MaintenanceOrderPdfButtonProps = {
  orderId: string;
  reference?: string;
  className?: string;
  label?: string;
  size?: "default" | "sm" | "icon";
};

export function MaintenanceOrderPdfButton({
  orderId,
  className,
  label = "Imprimer l'ordre (PDF)",
  size = "sm",
}: MaintenanceOrderPdfButtonProps) {
  const [pending, setPending] = React.useState(false);

  const onClick = async () => {
    setPending(true);
    try {
      await openMaintenanceOrderPrintFromApi(orderId);
    } catch {
      window.alert("Impossible d'ouvrir le document. Réessayez.");
    } finally {
      setPending(false);
    }
  };

  if (size === "icon") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-[#1F76FB]",
          className,
        )}
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
      variant="outline"
      size={size}
      className={cn("rounded-xl", size === "sm" && "h-9", className)}
      disabled={pending}
      onClick={onClick}
    >
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
      {label}
    </Button>
  );
}
