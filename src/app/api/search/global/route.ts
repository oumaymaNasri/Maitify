import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session-server";
import { runGlobalSearch } from "@/lib/gmao/global-search-query";
import type { GlobalSearchScope } from "@/lib/gmao/global-search-types";

const EMPTY = { machines: [], maintenance: [], parts: [] };
const SCOPES = new Set<GlobalSearchScope>(["all", "machines", "maintenance", "stock"]);

function parseScope(raw: string | null): GlobalSearchScope {
  if (raw && SCOPES.has(raw as GlobalSearchScope)) return raw as GlobalSearchScope;
  return "all";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (q.length < 3) {
    return NextResponse.json(EMPTY);
  }

  const user = getSession();
  if (!user) {
    return NextResponse.json({ error: "Session expirée." }, { status: 401 });
  }

  const scope = parseScope(searchParams.get("scope"));

  try {
    const results = await runGlobalSearch(q, scope, user);
    return NextResponse.json(results);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur recherche.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
