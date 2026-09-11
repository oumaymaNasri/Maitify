import type { TechnicianAvailability, TechnicianRole, TechnicianSpecialty } from "@prisma/client";
import { unstable_cache } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache/tags";
import { prisma } from "@/lib/db/prisma";

export type TechnicianRow = {
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
};

export async function fetchTechnicians(): Promise<TechnicianRow[]> {
  const rows = await prisma.technician.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      specialty: true,
      role: true,
      availability: true,
      email: true,
      phone: true,
      employeeCode: true,
      _count: { select: { maintenanceLogs: true } },
    },
  });

  return rows.map((t) => ({
    id: t.id,
    firstName: t.firstName,
    lastName: t.lastName,
    specialty: t.specialty,
    role: t.role,
    availability: t.availability,
    email: t.email,
    phone: t.phone,
    employeeCode: t.employeeCode,
    interventionCount: t._count.maintenanceLogs,
  }));
}

export function getTechniciansCached() {
  return unstable_cache(() => fetchTechnicians(), [CACHE_TAGS.technicians], {
    revalidate: 60,
    tags: [CACHE_TAGS.technicians],
  })();
}
