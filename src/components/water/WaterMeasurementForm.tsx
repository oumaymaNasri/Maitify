"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { WaterZone } from "@prisma/client";
import * as React from "react";
import { useForm } from "react-hook-form";

import { createWaterMeasurementAction } from "@/app/actions/water-quality";
import type { WaterMeasurementParsed } from "@/lib/validations/water-quality";
import type { WaterMeasurementFormOutput } from "@/lib/validations/water-measurement-form";
import { waterMeasurementFormSchema } from "@/lib/validations/water-measurement-form";
import { waterZoneFr } from "@/lib/view/labels";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function datetimeLocalNow(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function WaterMeasurementForm() {
  const [pending, startTransition] = React.useTransition();
  const [msg, setMsg] = React.useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const form = useForm({
    resolver: zodResolver(waterMeasurementFormSchema),
    defaultValues: {
      zone: WaterZone.EAU_ADOUC_IE,
      measuredAt: datetimeLocalNow(),
      ph: "",
      th: "",
      conductivity: "",
      ta: "",
      tac: "",
      cl: "",
      notes: "",
    },
  });

  const onSubmit = form.handleSubmit((values: WaterMeasurementFormOutput) => {
    setMsg(null);
    const payload: WaterMeasurementParsed = {
      ...values,
    };
    startTransition(async () => {
      const r = await createWaterMeasurementAction(payload);
      if (r.ok) {
        setMsg({ kind: "ok", text: "Mesure enregistrée." });
        form.reset({
          zone: values.zone,
          measuredAt: datetimeLocalNow(),
          ph: "",
          th: "",
          conductivity: "",
          ta: "",
          tac: "",
          cl: "",
          notes: "",
        });
      } else {
        setMsg({ kind: "err", text: r.error });
      }
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Saisie laboratoire / terrain</CardTitle>
        <CardDescription>Validation Zod + React Hook Form (paramètres chimiques)</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Zone</Label>
            <Select
              value={form.watch("zone")}
              onValueChange={(v) => form.setValue("zone", v as WaterZone, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(WaterZone).map((z) => (
                  <SelectItem key={z} value={z}>
                    {waterZoneFr(z)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.zone ? (
              <p className="text-xs text-destructive">{form.formState.errors.zone.message}</p>
            ) : null}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="wm-date">Date / heure</Label>
            <Input id="wm-date" type="datetime-local" {...form.register("measuredAt")} />
            {form.formState.errors.measuredAt ? (
              <p className="text-xs text-destructive">{form.formState.errors.measuredAt.message}</p>
            ) : null}
          </div>

          {(
            [
              ["ph", "pH"],
              ["th", "TH"],
              ["conductivity", "Conductivité (µS/cm)"],
              ["ta", "TA"],
              ["tac", "TAC"],
              ["cl", "Cl (mg/l)"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`wm-${key}`}>{label}</Label>
              <Input id={`wm-${key}`} inputMode="decimal" placeholder="—" {...form.register(key)} />
              {form.formState.errors[key] ? (
                <p className="text-xs text-destructive">{String(form.formState.errors[key]?.message)}</p>
              ) : null}
            </div>
          ))}

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="wm-notes">Notes</Label>
            <Textarea id="wm-notes" rows={2} {...form.register("notes")} />
          </div>

          {form.formState.errors.root ? (
            <p className="text-sm text-destructive sm:col-span-2">{form.formState.errors.root.message}</p>
          ) : null}

          {msg ? (
            <p
              className={
                msg.kind === "ok"
                  ? "text-sm text-emerald-700 sm:col-span-2"
                  : "text-sm text-destructive sm:col-span-2"
              }
            >
              {msg.text}
            </p>
          ) : null}

          <Button type="submit" className="sm:col-span-2 sm:w-auto" disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer la mesure"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
