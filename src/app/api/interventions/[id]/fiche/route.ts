import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session-server";
import { buildInterventionFichePdf } from "@/lib/export/intervention-fiche-pdf";
import { fetchInterventionDetail } from "@/lib/gmao/intervention-detail-query";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function sanitizeFileToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

export async function GET(_request: Request, context: RouteContext) {
  const user = getSession();
  if (!user) {
    return NextResponse.json({ error: "Session expirée. Veuillez vous reconnecter." }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "ID invalide." }, { status: 400 });
  }

  try {
    const detail = await fetchInterventionDetail(id);
    if (!detail) {
      return NextResponse.json({ error: "Intervention introuvable." }, { status: 404 });
    }
    if (user.role === "TECHNICIEN") {
      if (!user.technicianId || detail.technician?.id !== user.technicianId) {
        return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
      }
    }

    const pdfBytes = await buildInterventionFichePdf(detail);
    const machineName = sanitizeFileToken(detail.machine.name || "machine");
    const filename = `Fiche_Intervention_${machineName}.pdf`;
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBytes.length),
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur serveur.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
