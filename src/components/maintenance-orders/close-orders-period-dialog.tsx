"use client";

import { CalendarCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { closeOrdersPeriodAction } from "@/app/actions/maintenance-order";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function CloseOrdersPeriodDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("2026-08-08");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    setDone(null);
    const fd = new FormData();
    fd.set("fromDayKey", from);
    fd.set("toDayKey", to);
    const res = await closeOrdersPeriodAction(fd);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDone(
      `${res.orders} ordre(s) et ${res.logs} intervention(s) passés en Clôturé jusqu’au ${to.split("-").reverse().join("/")}.`,
    );
    router.refresh();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setError(null);
          setDone(null);
        }
      }}
    >
      <DialogTrigger
        type="button"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 shrink-0 gap-2 rounded-xl")}
      >
        <CalendarCheck className="h-4 w-4" aria-hidden />
        Clôturer les OM par période
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clôturer les OM par période</DialogTitle>
          <DialogDescription>
            Tous les ordres de la période (et les interventions rattachées) passent au statut Clôturé. Ils ne pourront
            plus être modifiés. Les KPI sont recalculés.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="om-close-from">Date de début (optionnel)</Label>
              <Input id="om-close-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="om-close-to">Clôturer tous les OM jusqu’au</Label>
              <Input id="om-close-to" type="date" required value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          {error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : null}
          {done ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{done}</p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={pending || !to} className="rounded-xl bg-[#1F76FB] hover:bg-[#1a65d6]">
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Clôture en cours…
                </>
              ) : (
                "Valider la clôture"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
