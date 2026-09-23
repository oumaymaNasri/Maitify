import { handleMaintenanceRemindersCron } from "@/lib/notify/maintenance-reminders-cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  return handleMaintenanceRemindersCron(req);
}

export async function POST(req: Request) {
  return handleMaintenanceRemindersCron(req);
}
