"use client";

import { TechnicianAvailability, TechnicianRole, TechnicianSpecialty } from "@prisma/client";
import { Loader2, Pencil } from "lucide-react";
import * as React from "react";

import { updateTechnicianAction } from "@/app/actions/technician";
import type { TechnicianRow } from "@/lib/gmao/technicians-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  technicianAvailabilityFr,
  technicianRoleFr,
  technicianSpecialtyFr,
} from "@/lib/view/gmao-labels";

type TechnicianEditDialogProps = {
  technician: TechnicianRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (technician: TechnicianRow) => void;
};

export function TechnicianEditDialog({ technician, open, onOpenChange, onUpdated }: TechnicianEditDialogProps) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [specialty, setSpecialty] = React.useState<TechnicianSpecialty>(TechnicianSpecialty.MECANIQUE);
  const [role, setRole] = React.useState<TechnicianRole>(TechnicianRole.TECHNICIEN);
  const [availability, setAvailability] = React.useState<TechnicianAvailability>(
    TechnicianAvailability.DISPONIBLE,
  );
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [employeeCode, setEmployeeCode] = React.useState("");

  React.useEffect(() => {
    if (!open || !technician) return;
    setFirstName(technician.firstName);
    setLastName(technician.lastName);
    setSpecialty(technician.specialty);
    setRole(technician.role);
    setAvailability(technician.availability);
    setEmail(technician.email ?? "");
    setPhone(technician.phone ?? "");
    setEmployeeCode(technician.employeeCode ?? "");
    setError(null);
  }, [open, technician]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!technician) return;
    setPending(true);
    setError(null);

    const fd = new FormData();
    fd.set("id", technician.id);
    fd.set("firstName", firstName);
    fd.set("lastName", lastName);
    fd.set("specialty", specialty);
    fd.set("role", role);
    fd.set("availability", availability);
    fd.set("email", email);
    fd.set("phone", phone);
    fd.set("employeeCode", employeeCode);

    const res = await updateTechnicianAction(fd);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }

    onUpdated({
      ...technician,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      specialty,
      role,
      availability,
      email: email.trim() || null,
      phone: phone.trim() || null,
      employeeCode: employeeCode.trim() || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-slate-200 bg-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <Pencil className="h-5 w-5 text-[#1F76FB]" />
            Modifier le technicien
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            {technician ? `${technician.firstName} ${technician.lastName}` : ""}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Prénom *</Label>
            <Input required value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={pending} />
          </div>
          <div className="space-y-2">
            <Label>Nom *</Label>
            <Input required value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={pending} />
          </div>
          <div className="space-y-2 sm:col-span-2">
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
          <div className="space-y-2">
            <Label>Rôle</Label>
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
          <div className="space-y-2 sm:col-span-2">
            <Label>E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={pending} />
          </div>
          <div className="space-y-2">
            <Label>Téléphone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={pending} />
          </div>
          <div className="space-y-2">
            <Label>Matricule</Label>
            <Input value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} disabled={pending} />
          </div>

          {error ? <p className="sm:col-span-2 text-sm text-rose-600">{error}</p> : null}

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending} className="bg-[#1F76FB] hover:bg-[#1a65d6]">
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
