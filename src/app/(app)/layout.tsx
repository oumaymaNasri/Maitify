import { AppShell } from "@/components/layout/AppShell";
import { getSession } from "@/lib/auth/session-server";
import { listInboxNotifications, type InboxSnapshot } from "@/lib/gmao/inbox-notifications";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = getSession();
  if (!user) {
    redirect("/");
  }

  let notifications: InboxSnapshot = { unread: 0, items: [] };
  try {
    notifications = await listInboxNotifications();
  } catch {
    notifications = { unread: 0, items: [] };
  }

  return (
    <AppShell user={user} notifications={notifications}>
      {children}
    </AppShell>
  );
}
