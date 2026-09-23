import { AlertSeverity, AlertType, InterventionType, MaintenanceOrderStatus, type Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { calendarDayKey } from "@/lib/gmao/intervention-status";
import { maintenanceNotifyEmail } from "@/lib/gmao/director-contact";
import { sendNotificationEmail } from "@/lib/notify/mailer";
import { formatDateFrShort } from "@/lib/utils/format-date";

export type ReminderWindow = "J0" | "J1";

export type PreventiveTaskRow = {
  machineName: string;
  location: string | null;
  tasks: string[];
  source: "line" | "log";
};

export type PreventiveReminderPayload = {
  orderId: string;
  reference: string;
  dayKey: string;
  window: ReminderWindow;
  tasks: PreventiveTaskRow[];
};

export type ReminderRunItem = {
  window: ReminderWindow;
  dayKey: string;
  reference: string | null;
  skipped: boolean;
  reason?: string;
  alertId?: string;
  emailed: boolean;
  mailError?: string;
  taskCount: number;
};

function addCalendarDays(dayKey: string, days: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function taskLabels(line: {
  taskNettoyage: boolean;
  taskGraissage: boolean;
  taskHuile: boolean;
  taskControl: boolean;
  taskNonConforme: boolean;
}): string[] {
  const labels: string[] = [];
  if (line.taskNettoyage) labels.push("Nettoyage");
  if (line.taskGraissage) labels.push("Graissage");
  if (line.taskHuile) labels.push("Huile");
  if (line.taskControl) labels.push("Contrôle");
  if (line.taskNonConforme) labels.push("Non conforme");
  return labels.length ? labels : ["Préventive"];
}

export async function loadPreventiveOmForDay(dayKey: string): Promise<Omit<PreventiveReminderPayload, "window"> | null> {
  const order = await prisma.maintenanceOrder.findFirst({
    where: {
      OR: [{ dayKey }, { reference: `OM-${dayKey}` }],
      status: { not: MaintenanceOrderStatus.CANCELLED },
    },
    include: {
      lines: {
        include: { machine: { select: { name: true, location: true } } },
        orderBy: { machine: { name: "asc" } },
      },
      logs: {
        where: { type: InterventionType.PREVENTIVE },
        select: {
          id: true,
          workPerformed: true,
          machine: { select: { name: true, location: true } },
        },
      },
    },
  });

  if (!order) return null;

  const tasks: PreventiveTaskRow[] = [];
  const seenMachines = new Set<string>();

  for (const line of order.lines) {
    seenMachines.add(line.machine.name);
    tasks.push({
      machineName: line.machine.name,
      location: line.machine.location,
      tasks: taskLabels(line),
      source: "line",
    });
  }

  for (const log of order.logs) {
    if (seenMachines.has(log.machine.name)) continue;
    seenMachines.add(log.machine.name);
    const work = log.workPerformed.trim();
    tasks.push({
      machineName: log.machine.name,
      location: log.machine.location,
      tasks: work ? [work] : ["Préventive"],
      source: "log",
    });
  }

  if (tasks.length === 0) return null;

  return {
    orderId: order.id,
    reference: order.reference,
    dayKey: order.dayKey ?? dayKey,
    tasks,
  };
}

function reminderCopy(window: ReminderWindow, payload: Omit<PreventiveReminderPayload, "window">) {
  const dateLabel = formatDateFrShort(`${payload.dayKey}T00:00:00.000Z`);
  const n = payload.tasks.length;
  const noun = n > 1 ? "maintenances préventives" : "maintenance préventive";
  if (window === "J1") {
    return {
      title: `Rappel J-1 — ${payload.reference}`,
      subject: `[NutriFish GMAO] Rappel J-1 — ${payload.reference} (${n} ${noun})`,
      intro: `Demain (${dateLabel}), l’ordre ${payload.reference} prévoit ${n} ${noun}.`,
      severity: AlertSeverity.INFO,
    };
  }
  return {
    title: `Rappel du jour — ${payload.reference}`,
    subject: `[NutriFish GMAO] Jour J — ${payload.reference} (${n} ${noun})`,
    intro: `Aujourd’hui (${dateLabel}), l’ordre ${payload.reference} contient ${n} ${noun} à réaliser.`,
    severity: AlertSeverity.WARNING,
  };
}

function renderEmail(window: ReminderWindow, payload: Omit<PreventiveReminderPayload, "window">) {
  const copy = reminderCopy(window, payload);
  const rows = payload.tasks
    .map((t) => {
      const loc = t.location ? ` (${t.location})` : "";
      return `• ${t.machineName}${loc} — ${t.tasks.join(", ")}`;
    })
    .join("\n");
  const text = `${copy.intro}\n\n${rows}\n\nOuvrez GMAO → Ordres de maintenance (${payload.reference}).\nDestinataire : ${maintenanceNotifyEmail()}`;
  const htmlRows = payload.tasks
    .map((t) => {
      const loc = t.location ? ` <span style="color:#64748b">(${t.location})</span>` : "";
      return `<tr><td style="padding:8px 10px;border-bottom:1px solid #e2e8f0">${t.machineName}${loc}</td><td style="padding:8px 10px;border-bottom:1px solid #e2e8f0">${t.tasks.join(", ")}</td></tr>`;
    })
    .join("");
  const html = `<!DOCTYPE html><html><body style="font-family:Segoe UI,sans-serif;color:#0f172a">
  <p>${copy.intro}</p>
  <table style="border-collapse:collapse;width:100%;max-width:640px">
    <thead><tr style="background:#0B2A5B;color:#fff"><th align="left" style="padding:8px 10px">Équipement</th><th align="left" style="padding:8px 10px">Tâches</th></tr></thead>
    <tbody>${htmlRows}</tbody>
  </table>
  <p style="margin-top:16px;font-size:13px;color:#475569">NutriFish GMAO — rappel automatique (veille et jour J).</p>
  </body></html>`;
  return { ...copy, text, html };
}

export async function dispatchPreventiveReminder(
  window: ReminderWindow,
  dayKey: string,
): Promise<ReminderRunItem> {
  const payload = await loadPreventiveOmForDay(dayKey);
  if (!payload) {
    return { window, dayKey, reference: null, skipped: true, reason: "Aucun OM préventif", emailed: false, taskCount: 0 };
  }

  const dedupeKey = `preventive-reminder:${window}:${payload.dayKey}`;
  const existing = await prisma.gmaoAlert.findUnique({ where: { dedupeKey } });
  if (existing) {
    return {
      window,
      dayKey,
      reference: payload.reference,
      skipped: true,
      reason: "Déjà envoyé",
      alertId: existing.id,
      emailed: false,
      taskCount: payload.tasks.length,
    };
  }

  const email = renderEmail(window, payload);
  const href = `/maintenance-orders?q=${encodeURIComponent(payload.reference)}`;
  let alert;
  try {
    alert = await prisma.gmaoAlert.create({
      data: {
        type: AlertType.PREVENTIVE_REMINDER,
        severity: email.severity,
        title: email.title,
        message: `${email.intro}\n${payload.tasks.map((t) => `• ${t.machineName} — ${t.tasks.join(", ")}`).join("\n")}`,
        dedupeKey,
        metadata: {
          orderId: payload.orderId,
          reference: payload.reference,
          dayKey: payload.dayKey,
          window,
          href,
          taskCount: payload.tasks.length,
          dedupeKey,
        } as Prisma.InputJsonValue,
      },
    });
  } catch (e) {
    const code = typeof e === "object" && e && "code" in e ? String((e as { code?: string }).code) : "";
    if (code === "P2002") {
      return {
        window,
        dayKey,
        reference: payload.reference,
        skipped: true,
        reason: "Déjà envoyé",
        emailed: false,
        taskCount: payload.tasks.length,
      };
    }
    throw e;
  }

  const mail = await sendNotificationEmail({
    to: maintenanceNotifyEmail(),
    subject: email.subject,
    text: email.text,
    html: email.html,
  });

  if (!mail.ok) {
    await prisma.gmaoAlert.update({
      where: { id: alert.id },
      data: {
        metadata: {
          orderId: payload.orderId,
          reference: payload.reference,
          dayKey: payload.dayKey,
          window,
          href,
          taskCount: payload.tasks.length,
          dedupeKey,
          mailError: mail.error,
        } as Prisma.InputJsonValue,
      },
    });
  }

  return {
    window,
    dayKey,
    reference: payload.reference,
    skipped: false,
    alertId: alert.id,
    emailed: mail.ok,
    mailError: mail.ok ? undefined : mail.error,
    taskCount: payload.tasks.length,
  };
}

export async function runPreventiveReminders(now = new Date()): Promise<{ today: string; items: ReminderRunItem[] }> {
  const today = calendarDayKey(now);
  const tomorrow = addCalendarDays(today, 1);
  const items = [
    await dispatchPreventiveReminder("J1", tomorrow),
    await dispatchPreventiveReminder("J0", today),
  ];
  return { today, items };
}
