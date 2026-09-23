import { NextResponse } from "next/server";

import { runPreventiveReminders } from "@/lib/gmao/preventive-reminders";
import { authorizeCronRequest } from "@/lib/notify/cron-auth";
import { mailerDiagnostics } from "@/lib/notify/mailer";

export async function handleMaintenanceRemindersCron(req: Request) {
  if (!authorizeCronRequest(req)) {
    return NextResponse.json({ ok: false, error: "Non autorisé." }, { status: 401 });
  }

  const mailer = mailerDiagnostics();
  try {
    const result = await runPreventiveReminders();
    return NextResponse.json({ ok: true, ...result, mailer: result.mailer ?? mailer });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message, mailer }, { status: 500 });
  }
}
