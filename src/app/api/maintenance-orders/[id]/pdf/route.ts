import { NextResponse } from "next/server";

import { authorizeApiRequest } from "@/lib/auth/session-server";
import { fetchMaintenanceOrderDetail } from "@/lib/gmao/maintenance-order-detail-query";
import { buildMaintenanceOrderHtml } from "@/lib/export/maintenance-order-html";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const auth = authorizeApiRequest();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Ordre introuvable." }, { status: 400 });
  }

  const detail = await fetchMaintenanceOrderDetail(id);
  if (!detail) {
    return NextResponse.json({ error: "Ordre introuvable." }, { status: 404 });
  }

  const html = buildMaintenanceOrderHtml(detail);
  const safeRef = detail.reference.replace(/[^a-zA-Z0-9_-]+/g, "_");

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="Ordre_Maintenance_${safeRef}.html"`,
      "Cache-Control": "no-store",
    },
  });
}
