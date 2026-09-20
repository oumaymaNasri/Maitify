import { NextResponse } from "next/server";

import { authorizeApiRequest } from "@/lib/auth/session-server";
import { suggestExcelMapping, previewMappedRows } from "@/lib/gmao/excel-maintenance-columns";
import { parseMaintenanceWorkbook } from "@/lib/gmao/excel-maintenance-parse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 12 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = authorizeApiRequest();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 403 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier Excel manquant." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (12 Mo max)." }, { status: 400 });
  }
  const name = file.name.toLowerCase();
  if (!name.endsWith(".xlsx")) {
    return NextResponse.json(
      { error: "Utilisez un fichier .xlsx (enregistrez le .xls au format Excel 2007+)." },
      { status: 400 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseMaintenanceWorkbook(buffer);
    const suggestedMapping = suggestExcelMapping(parsed.headers);
    return NextResponse.json({
      fileName: file.name,
      headers: parsed.headers,
      rowCount: parsed.rows.length,
      skippedEmpty: parsed.skippedEmpty,
      suggestedMapping,
      sampleRaw: parsed.rows.slice(0, 8),
      preview: previewMappedRows(parsed.rows, suggestedMapping),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lecture Excel impossible." },
      { status: 400 },
    );
  }
}
