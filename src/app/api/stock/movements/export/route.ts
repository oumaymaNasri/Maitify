import { NextRequest, NextResponse } from "next/server";

import { authorizeApiRequest } from "@/lib/auth/session-server";
import { movementsToCsvString, movementsToHtml } from "@/lib/export/stock-export";
import { fetchStockMovements } from "@/lib/gmao/stock-movements-query";

export async function GET(request: NextRequest) {
  const auth = authorizeApiRequest();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 403 });

  const format = request.nextUrl.searchParams.get("format") ?? "csv";

  try {
    const items = await fetchStockMovements();

    if (format === "pdf" || format === "html") {
      return new NextResponse(movementsToHtml(items), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new NextResponse(movementsToCsvString(items), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="mouvements-stock-nutrifish.csv"',
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
