import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { authorizeApiRequest } from "@/lib/auth/session-server";
import { CACHE_TAGS } from "@/lib/cache/tags";
import {
  EXCEL_MAINTENANCE_FIELDS,
  type ExcelColumnMapping,
  type ExcelMaintenanceFieldKey,
} from "@/lib/gmao/excel-maintenance-columns";
import { parseMaintenanceWorkbook } from "@/lib/gmao/excel-maintenance-parse";
import { persistMappedExcelRows } from "@/lib/gmao/excel-maintenance-persist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 12 * 1024 * 1024;
const MAX_ROWS = 20000;

function parseMapping(raw: unknown): ExcelColumnMapping | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const mapping = {} as ExcelColumnMapping;
  for (const field of EXCEL_MAINTENANCE_FIELDS) {
    const v = rec[field.key];
    mapping[field.key as ExcelMaintenanceFieldKey] = typeof v === "string" && v.trim() ? v.trim() : null;
  }
  if (!mapping.date) return null;
  return mapping;
}

export async function POST(request: Request) {
  const auth = authorizeApiRequest();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 403 });

  const form = await request.formData();
  const file = form.get("file");
  const mappingRaw = form.get("mapping");
  if (!(file instanceof File) || typeof mappingRaw !== "string") {
    return NextResponse.json({ error: "Fichier ou mappage manquant." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (12 Mo max)." }, { status: 400 });
  }

  let mapping: ExcelColumnMapping | null = null;
  try {
    mapping = parseMapping(JSON.parse(mappingRaw));
  } catch {
    mapping = null;
  }
  if (!mapping) {
    return NextResponse.json({ error: "Le mappage doit au minimum relier la colonne Date." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseMaintenanceWorkbook(buffer);
    if (parsed.rows.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `Trop de lignes (${parsed.rows.length}). Maximum ${MAX_ROWS}.` },
        { status: 400 },
      );
    }
    const result = await persistMappedExcelRows(parsed.rows, mapping);
    revalidateTag(CACHE_TAGS.interventions);
    revalidateTag(CACHE_TAGS.machines);
    revalidateTag(CACHE_TAGS.technicians);
    revalidateTag(CACHE_TAGS.maintenanceOrders);
    revalidateTag(CACHE_TAGS.dashboard);
    revalidatePath("/interventions");
    revalidatePath("/maintenance-orders");
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Import impossible." },
      { status: 500 },
    );
  }
}
