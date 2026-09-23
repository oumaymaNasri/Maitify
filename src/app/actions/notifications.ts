"use server";

import { revalidatePath } from "next/cache";

import { getSession, requireManageAction } from "@/lib/auth/session-server";
import { listInboxNotifications, markAlertRead, markAllAlertsRead } from "@/lib/gmao/inbox-notifications";
import { runPreventiveReminders } from "@/lib/gmao/preventive-reminders";

export async function fetchInboxAction() {
  if (!getSession()) return { unread: 0, items: [] };
  return listInboxNotifications();
}

export async function markNotificationReadAction(id: string) {
  if (!getSession()) return { ok: false as const, error: "Non connecté." };
  await markAlertRead(id);
  return { ok: true as const };
}

export async function markAllNotificationsReadAction() {
  if (!getSession()) return { ok: false as const, error: "Non connecté." };
  const count = await markAllAlertsRead();
  return { ok: true as const, count };
}

export async function runPreventiveRemindersAction() {
  const auth = requireManageAction();
  if (!auth.ok) return { ok: false as const, error: auth.error };
  const result = await runPreventiveReminders();
  revalidatePath("/dashboard");
  revalidatePath("/maintenance-orders");
  return { ok: true as const, ...result };
}
