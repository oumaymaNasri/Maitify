import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session-server";
import { listInboxNotifications } from "@/lib/gmao/inbox-notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!getSession()) {
    return NextResponse.json({ unread: 0, items: [] }, { status: 401 });
  }
  try {
    const snapshot = await listInboxNotifications();
    return NextResponse.json(snapshot);
  } catch (e) {
    return NextResponse.json({ unread: 0, items: [], error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
