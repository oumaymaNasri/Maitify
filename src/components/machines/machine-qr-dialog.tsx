"use client";

import { Loader2, QrCode } from "lucide-react";
import * as React from "react";

import { ensureMachineQrCodeAction } from "@/app/actions/machine";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type MachineQrDialogProps = {
  machineId: string;
  machineName: string;
  initialQrCode: string | null;
};

function qrImageUrl(payload: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(payload)}`;
}

export function MachineQrDialog({ machineId, machineName, initialQrCode }: MachineQrDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [qrCode, setQrCode] = React.useState(initialQrCode);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setQrCode(initialQrCode);
  }, [initialQrCode]);

  const loadQr = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await ensureMachineQrCodeAction(machineId);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setQrCode(res.qrCode ?? null);
  }, [machineId]);

  React.useEffect(() => {
    if (open && !qrCode) void loadQr();
  }, [open, qrCode, loadQr]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        type="button"
        className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "gap-1.5")}
      >
        <QrCode className="h-4 w-4 shrink-0" aria-hidden />
        QR Code
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>QR Code — {machineName}</DialogTitle>
          <DialogDescription>Code unique pour identification terrain (scan atelier).</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          {loading ? (
            <div className="flex h-[240px] w-[240px] items-center justify-center rounded-lg border bg-muted">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="text-center text-sm text-destructive">{error}</p>
          ) : qrCode ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrImageUrl(qrCode)}
                alt={`QR code ${machineName}`}
                width={240}
                height={240}
                className="rounded-lg border bg-white p-2"
              />
              <p className="max-w-full break-all text-center font-mono text-[11px] text-muted-foreground">{qrCode}</p>
            </>
          ) : null}
          <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => void loadQr()}>
            {qrCode ? "Régénérer" : "Générer le QR"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
