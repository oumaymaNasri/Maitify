import { prisma } from "@/lib/db/prisma";

export async function fetchMachineDetail(id: string) {
  return prisma.machine.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      location: true,
      legacyMatricule: true,
      assetStatus: true,
      maintenanceSector: true,
      description: true,
      qrCode: true,
      targetAvailability: true,
      galleryImageUrls: true,
      photos: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true, caption: true } },
      manuals: {
        orderBy: { createdAt: "desc" },
        take: 12,
        select: { id: true, title: true, fileUrl: true, category: true },
      },
      spareParts: {
        orderBy: { designation: "asc" },
        take: 20,
        select: { id: true, designation: true, quantity: true, minStock: true, reference: true },
      },
      maintenanceLogs: {
        orderBy: { date: "desc" },
        take: 40,
        select: {
          id: true,
          date: true,
          operationType: true,
          workflowStatus: true,
          workPerformed: true,
          durationMinutes: true,
          failureDescription: true,
          technician: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
}

export type MachineDetailDto = NonNullable<Awaited<ReturnType<typeof fetchMachineDetail>>>;
