"use client";

import { Bell, CheckCheck, Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
  runPreventiveRemindersAction,
} from "@/app/actions/notifications";
import { useSession } from "@/components/providers/session-provider";
import type { InboxNotificationVm, InboxSnapshot } from "@/lib/gmao/inbox-notifications";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

export function NotificationCenter({ initial }: { initial: InboxSnapshot }) {
  const router = useRouter();
  const { isManager } = useSession();
  const [snapshot, setSnapshot] = React.useState(initial);
  const [pending, setPending] = React.useState(false);
  const [runHint, setRunHint] = React.useState<string | null>(null);

  React.useEffect(() => {
    setSnapshot(initial);
  }, [initial]);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      void fetch("/api/notifications")
        .then((r) => (r.ok ? r.json() : null))
        .then((data: InboxSnapshot | null) => {
          if (data?.items) setSnapshot(data);
        })
        .catch(() => undefined);
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const markOne = async (item: InboxNotificationVm) => {
    await markNotificationReadAction(item.id);
    setSnapshot((prev) => ({
      unread: Math.max(0, prev.unread - 1),
      items: prev.items.filter((x) => x.id !== item.id),
    }));
    if (item.href) router.push(item.href);
  };

  const markAll = async () => {
    setPending(true);
    await markAllNotificationsReadAction();
    setSnapshot({ unread: 0, items: [] });
    setPending(false);
    router.refresh();
  };

  const runNow = async () => {
    setPending(true);
    setRunHint(null);
    const result = await runPreventiveRemindersAction();
    setPending(false);
    if (!result.ok) {
      setRunHint(result.error);
      return;
    }
    const sent = result.items.filter((i) => !i.skipped);
    const mailed = sent.filter((i) => i.emailed).length;
    const mailErrors = sent.map((i) => i.mailError).filter(Boolean);
    if (!result.mailer.configured) {
      setRunHint(
        "Rappels in-app créés, mais aucun e-mail : ajoutez RESEND_API_KEY, SENDGRID_API_KEY ou SMTP_HOST sur Vercel.",
      );
    } else if (mailErrors.length) {
      setRunHint(mailErrors[0] ?? "Échec d’envoi e-mail.");
    } else {
      setRunHint(
        sent.length
          ? `${sent.length} rappel(s), ${mailed} e-mail(s) vers ${result.mailer.to}.`
          : "Aucun nouveau rappel (déjà envoyé ou pas d’OM préventif).",
      );
    }
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "relative h-9 w-9 text-sky-100 hover:bg-white/10 hover:text-white",
        )}
        aria-label={`Notifications${snapshot.unread ? ` (${snapshot.unread} non lues)` : ""}`}
      >
        <Bell className="h-4 w-4" aria-hidden />
        {snapshot.unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-slate-900">
            {snapshot.unread > 9 ? "9+" : snapshot.unread}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[22rem] p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-3 py-2.5">
          <span>Notifications</span>
          {snapshot.unread > 0 ? (
            <button
              type="button"
              onClick={() => void markAll()}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1F76FB] hover:underline"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Tout lire
            </button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-80 overflow-y-auto">
          {snapshot.items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-slate-500">Aucune alerte en attente.</p>
          ) : (
            snapshot.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void markOne(item)}
                className="block w-full border-b border-slate-100 px-3 py-2.5 text-left hover:bg-slate-50"
              >
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{item.message}</p>
                <p className="mt-1 text-[10px] text-slate-500">{formatWhen(item.createdAt)}</p>
              </button>
            ))
          )}
        </div>
        {isManager ? (
          <>
            <DropdownMenuSeparator className="m-0" />
            <div className="px-3 py-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => void runNow()}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                Envoyer les rappels J-1 / Jour J
              </button>
              {runHint ? <p className="mt-1.5 text-[11px] text-slate-500">{runHint}</p> : null}
              <Link href="/notifications" className="mt-1.5 block text-center text-[11px] text-[#1F76FB] hover:underline">
                Centre de notifications
              </Link>
            </div>
          </>
        ) : (
          <div className="px-3 py-2">
            <Link href="/notifications" className="block text-center text-[11px] text-[#1F76FB] hover:underline">
              Centre de notifications
            </Link>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
