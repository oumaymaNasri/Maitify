import { TechnicianAvailability } from "@prisma/client";
import { NextResponse } from "next/server";

import { authorizeApiRequest } from "@/lib/auth/session-server";
import { fetchTechnicians } from "@/lib/gmao/technicians-query";
import {
  technicianAvailabilityFr,
  technicianRoleFr,
  technicianSpecialtyFr,
} from "@/lib/view/gmao-labels";

function escapeCsv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const auth = authorizeApiRequest();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "csv";
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const status = searchParams.get("status") ?? "ALL";

  try {
    let items = await fetchTechnicians();

    if (status !== "ALL" && Object.values(TechnicianAvailability).includes(status as TechnicianAvailability)) {
      items = items.filter((t) => t.availability === status);
    }
    if (q) {
      items = items.filter((t) => {
        const blob = `${t.firstName} ${t.lastName} ${technicianSpecialtyFr(t.specialty)} ${t.email ?? ""} ${t.employeeCode ?? ""}`.toLowerCase();
        return blob.includes(q);
      });
    }

    if (format === "csv") {
      const header = [
        "Nom",
        "Prénom",
        "Spécialité",
        "Rôle",
        "Statut",
        "E-mail",
        "Téléphone",
        "Matricule",
        "Interventions",
      ];
      const lines = [
        header.map(escapeCsv).join(";"),
        ...items.map((t) =>
          [
            t.lastName,
            t.firstName,
            technicianSpecialtyFr(t.specialty),
            technicianRoleFr(t.role),
            technicianAvailabilityFr(t.availability),
            t.email ?? "—",
            t.phone ?? "—",
            t.employeeCode ?? "—",
            String(t.interventionCount),
          ]
            .map(escapeCsv)
            .join(";"),
        ),
      ];
      return new NextResponse("\uFEFF" + lines.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="techniciens-nutrifish.csv"',
        },
      });
    }

    if (format === "html" || format === "pdf") {
      const rows = items
        .map(
          (t) =>
            `<tr>
              <td>${t.lastName}</td><td>${t.firstName}</td>
              <td>${technicianSpecialtyFr(t.specialty)}</td>
              <td>${technicianRoleFr(t.role)}</td>
              <td>${technicianAvailabilityFr(t.availability)}</td>
              <td>${t.interventionCount}</td>
            </tr>`,
        )
        .join("");
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Liste des Techniciens</title>
<style>body{font-family:system-ui,sans-serif;padding:24px;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #e2e8f0;padding:6px 8px;font-size:11px;} th{background:#1F76FB;color:#fff;}</style>
</head><body><h1 style="color:#1F76FB;">NutriFish — Liste des Techniciens</h1><p>${items.length} ligne(s)</p>
<table><thead><tr><th>Nom</th><th>Prénom</th><th>Spécialité</th><th>Rôle</th><th>Statut</th><th>Interventions</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
      return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    return NextResponse.json({ error: "Format non supporté (csv, html)." }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur export.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
