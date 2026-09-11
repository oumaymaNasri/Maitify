import { NextResponse } from "next/server";

import {
  buildMachineHistoryCsv,
  buildMachineHistoryPdfHtml,
  sanitizeMachineExportFilename,
} from "@/lib/export/machine-history-export";
import {
  fetchMachineHistoryExportRows,
  fetchMachineHistoryHeader,
} from "@/lib/gmao/machine-history-query";
import { authorizeApiRequest } from "@/lib/auth/session-server";

type RouteContext = { params: { id: string } };

export async function GET(request: Request, { params }: RouteContext) {
  const auth = authorizeApiRequest();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "csv";

  try {
    const [header, rows] = await Promise.all([
      fetchMachineHistoryHeader(params.id),
      fetchMachineHistoryExportRows(params.id),
    ]);

    if (!header || rows === null) {
      return NextResponse.json({ error: "Machine introuvable." }, { status: 404 });
    }

    if (format === "csv") {
      const csv = buildMachineHistoryCsv(rows);
      const filename = `historique_${sanitizeMachineExportFilename(header.name)}.csv`;
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    if (format === "html" || format === "pdf") {
      const html = buildMachineHistoryPdfHtml(header, rows);
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
