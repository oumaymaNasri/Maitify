import { AppShell } from "@/components/layout/AppShell";
import { getSession } from "@/lib/auth/session-server";
import { redirect } from "next/navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const user = getSession();
  if (!user) {
    redirect("/");
  }

  return <AppShell user={user}>{children}</AppShell>;
}
