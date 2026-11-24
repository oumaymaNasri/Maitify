import { NextResponse } from "next/server";

import { authorizeCronRequest } from "@/lib/notify/cron-auth";
import { generateAllPreventiveOrders } from "@/lib/preventive/generate-orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Cron quotidien : génère les OM préventifs des plans actifs et met à jour les retards. */
async function handle(req: Request) {
  if (!authorizeCronRequest(req)) {
    return NextResponse.json({ ok: false, error: "Non autorisé." }, { status: 401 });
  }
  try {
    const result = await generateAllPreventiveOrders();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
