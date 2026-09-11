"use client";

import { TechnicianAvailability, TechnicianRole, TechnicianSpecialty } from "@prisma/client";
import { Loader2, Plus } from "lucide-react";
import * as React from "react";

import { createTechnicianAction } from "@/app/actions/technician";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  technicianAvailabilityFr,
  technicianRoleFr,
  technicianSpecialtyFr,
} from "@/lib/view/gmao-labels";

type AddTechnicianSheetProps = {
  onCreated?: (technician: {
    id: string;
    firstName: string;
    lastName: string;
    specialty: TechnicianSpecialty;
    role: TechnicianRole;
    availability: TechnicianAvailability;
    email: string | null;
    phone: string | null;
    employeeCode: string | null;
    interventionCount: number;
  }) => void;
};

export function AddTechnicianSheet({ onCreated }: AddTechnicianSheetProps = {}) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [specialty, setSpecialty] = React.useState<TechnicianSpecialty>(TechnicianSpecialty.MECANIQUE);
  const [role, setRole] = React.useState<TechnicianRole>(TechnicianRole.TECHNICIEN);
  const [availability, setAvailability] = React.useState<TechnicianAvailability>(
    TechnicianAvailability.DISPONIBLE,
  );

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("specialty", specialty);
    fd.set("role", role);
    fd.set("availability", availability);
    const res = await createTechnicianAction(fd);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onCreated?.({
      id: res.id,
      firstName: String(fd.get("firstName") ?? "").trim(),
      lastName: String(fd.get("lastName") ?? "").trim(),
      specialty,
      role,
      availability,
      email: String(fd.get("email") ?? "").trim() || null,
      phone: String(fd.get("phone") ?? "").trim() || null,
      employeeCode: String(fd.get("employeeCode") ?? "").trim() || null,
      interventionCount: 0,
    });
    setOpen(false);
    e.currentTarget.reset();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        type="button"
        className={cn(buttonVariants({ size: "sm" }), "h-9 shrink-0 gap-2 rounded-xl bg-[#1F76FB] hover:bg-[#1a65d6]")}
      >
        <Plus className="h-4 w-4" aria-hidden />
        Ajouter un technicien
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Nouveau technicien</SheetTitle>
          <SheetDescription>RH et affectation interventions NutriFish</SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="mt-6 flex flex-1 flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom *</Label>
              <Input id="firstName" name="firstName" required disabled={pending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom *</Label>
              <Input id="lastName" name="lastName" required disabled={pending} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Spécialité *</Label>
            <Select value={specialty} onValueChange={(v) => setSpecialty(v as TechnicianSpecialty)} disabled={pending}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(TechnicianSpecialty).map((s) => (
                  <SelectItem key={s} value={s}>
                    {technicianSpecialtyFr(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as TechnicianRole)} disabled={pending}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TechnicianRole).map((r) => (
                    <SelectItem key={r} value={r}>
                      {technicianRoleFr(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select
                value={availability}
                onValueChange={(v) => setAvailability(v as TechnicianAvailability)}
                disabled={pending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TechnicianAvailability).map((a) => (
                    <SelectItem key={a} value={a}>
                      {technicianAvailabilityFr(a)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" disabled={pending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input id="phone" name="phone" disabled={pending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="employeeCode">Matricule</Label>
            <Input id="employeeCode" name="employeeCode" disabled={pending} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <SheetFooter className="mt-auto gap-2 sm:flex-col">
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Enregistrement…
                </>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
