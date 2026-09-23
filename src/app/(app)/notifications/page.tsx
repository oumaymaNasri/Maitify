import { DbErrorHint } from "@/components/layout/DbError";
import { ButtonLink } from "@/components/ui/button";
import { listInboxNotifications } from "@/lib/gmao/inbox-notifications";
import { formatDateFrShortWithTime } from "@/lib/utils/format-date";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  try {
    const inbox = await listInboxNotifications(50);
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Centre de notifications</h1>
            <p className="text-sm text-slate-600">
              Rappels préventifs J-1 / Jour J, stock et alertes GMAO ({inbox.unread} non lue
              {inbox.unread > 1 ? "s" : ""}).
            </p>
          </div>
          <ButtonLink href="/maintenance-orders" variant="outline" size="sm">
            Ordres de maintenance
          </ButtonLink>
        </div>
        {inbox.items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-600">
            Aucune notification en attente.
          </p>
        ) : (
          <ul className="space-y-2">
            {inbox.items.map((item) => (
              <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{item.message}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>{formatDateFrShortWithTime(item.createdAt)}</span>
                  {item.href ? (
                    <ButtonLink href={item.href} variant="outline" size="sm" className="h-7">
                      Ouvrir
                    </ButtonLink>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  } catch (e) {
    return <DbErrorHint detail={e instanceof Error ? e.message : String(e)} />;
  }
}
