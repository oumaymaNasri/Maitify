import { TechnicianAvailability, TechnicianRole, TechnicianSpecialty } from "@prisma/client";
import { z } from "zod";

export const technicianSchema = z.object({
  firstName: z.string().trim().min(1, "Prénom requis"),
  lastName: z.string().trim().min(1, "Nom requis"),
  specialty: z.nativeEnum(TechnicianSpecialty),
  role: z.nativeEnum(TechnicianRole).default(TechnicianRole.TECHNICIEN),
  availability: z.nativeEnum(TechnicianAvailability).default(TechnicianAvailability.DISPONIBLE),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  employeeCode: z.string().optional(),
});

export type TechnicianInput = z.infer<typeof technicianSchema>;

export const technicianUpdateSchema = technicianSchema.extend({
  id: z.string().min(1, "Technicien introuvable"),
});

export type TechnicianUpdateInput = z.infer<typeof technicianUpdateSchema>;
