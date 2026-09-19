import { MaintenanceWorkflowStatus, OperationType } from "@prisma/client";
import { NextResponse } from "next/server";

import { authorizeApiRequest } from "@/lib/auth/session-server";
import { fetchAllInterventionsInventory } from "@/lib/gmao/interventions-query";
import { formatDateFrShort } from "@/lib/utils/format-date";
import { operationTypeFr } from "@/lib/view/gmao-labels";
import { maintenanceWorkflowStatusFr } from "@/lib/view/machine-labels";

function escapeCsv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function formatDate(iso: string): string {
  return formatDateFrShort(iso);
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
  const operation = searchParams.get("operation") ?? "ALL";
  const dateRange = searchParams.get("dateRange") ?? "ALL";

  try {
    let items = await fetchAllInterventionsInventory();

    if (status !== "ALL" && Object.values(MaintenanceWorkflowStatus).includes(status as MaintenanceWorkflowStatus)) {
      items = items.filter((r) => r.workflowStatus === status);
    }
    if (operation !== "ALL" && Object.values(OperationType).includes(operation as OperationType)) {
      items = items.filter((r) => r.operationType === operation);
    }
    if (q) {
      items = items.filter((r) => {
        const blob = `${r.machineName} ${r.machineLocation} ${r.technicianName ?? ""} ${r.workPerformed} ${r.failureDescription ?? ""} ${r.operation ?? ""}`.toLowerCase();
        return blob.includes(q);
      });
    }
    if (dateRange !== "ALL") {
      const now = Date.now();
      const days = dateRange === "7" ? 7 : dateRange === "30" ? 30 : dateRange === "90" ? 90 : 0;
      if (days > 0) {
        const cutoff = now - days * 24 * 60 * 60 * 1000;
        items = items.filter((r) => new Date(r.date).getTime() >= cutoff);
      }
    }

    if (format === "csv") {
      const header = [
        "Date",
        "Machine",
        "Emplacement",
        "Technicien",
        "Opération",
        "Statut",
        "Durée (min)",
        "Dysfonctionnement",
        "Travaux réalisés",
      ];
      const lines = [
        header.map(escapeCsv).join(";"),
        ...items.map((r) =>
          [
            formatDate(r.date),
            r.machineName,
            r.machineLocation,
            r.technicianName ?? "—",
            operationTypeFr(r.operationType),
            maintenanceWorkflowStatusFr(r.workflowStatus),
            r.durationMinutes != null ? String(r.durationMinutes) : "—",
            r.failureDescription ?? "—",
            r.workPerformed,
          ]
            .map(escapeCsv)
            .join(";"),
        ),
      ];
      const bom = "\uFEFF";
      return new NextResponse(bom + lines.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="liste-maintenance-nutrifish.csv"`,
        },
      });
    }

    if (format === "html" || format === "pdf") {
      const rows = items
        .map(
          (r) =>
            `<tr>
              <td>${formatDate(r.date)}</td>
              <td>${r.machineName}</td>
              <td>${r.machineLocation}</td>
              <td>${r.technicianName ?? "—"}</td>
              <td>${operationTypeFr(r.operationType)}</td>
              <td>${maintenanceWorkflowStatusFr(r.workflowStatus)}</td>
              <td>${r.durationMinutes ?? "—"}</td>
            </tr>`,
        )
        .join("");

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Liste de Maintenance</title>
<style>body{font-family:system-ui,sans-serif;padding:24px;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #e2e8f0;padding:6px 8px;font-size:11px;} th{background:#1F76FB;color:#fff;}</style>
</head><body>
<h1 style="color:#1F76FB;">NutriFish — Liste de Maintenance</h1>
<p>${items.length} ligne(s)</p>
<table><thead><tr><th>Date</th><th>Machine</th><th>Emplacement</th><th>Technicien</th><th>Opération</th><th>Statut</th><th>Durée</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;

      return new NextResponse(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return NextResponse.json({ error: "Format non supporté (csv, html)." }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur export.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
