import { NextResponse } from "next/server";

import { authorizeApiRequest } from "@/lib/auth/session-server";
import { prisma } from "@/lib/db/prisma";
import { buildMaintenanceImportTemplate } from "@/lib/gmao/excel-maintenance-template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = authorizeApiRequest();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 403 });

  const technicians = await prisma.technician.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { firstName: true, lastName: true },
  });
  const names = technicians.map((t) =>
    t.lastName === "—" ? t.firstName : `${t.firstName} ${t.lastName}`.replace(/\s+/g, " ").trim(),
  );

  const buffer = await buildMaintenanceImportTemplate(names);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="modele-import-maintenances.xlsx"',
    },
  });
}
