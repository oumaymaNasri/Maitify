import { NextResponse } from "next/server";

import { runPreventiveReminders } from "@/lib/gmao/preventive-reminders";
import { authorizeCronRequest } from "@/lib/notify/cron-auth";

export async function handleMaintenanceRemindersCron(req: Request) {
  if (!authorizeCronRequest(req)) {
    return NextResponse.json({ ok: false, error: "Non autorisé." }, { status: 401 });
  }

  try {
    const result = await runPreventiveReminders();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
