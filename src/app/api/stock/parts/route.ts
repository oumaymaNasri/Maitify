import { NextResponse } from "next/server";

import { authorizeApiRequest } from "@/lib/auth/session-server";
import { fetchPartsInventory } from "@/lib/gmao/stock-parts-query";

export async function GET() {
  const auth = authorizeApiRequest();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 403 });

  try {
    const items = await fetchPartsInventory();
    return NextResponse.json({ items, total: items.length });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
