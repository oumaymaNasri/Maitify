import { redirect } from "next/navigation";

import { LoginPortal } from "@/components/auth/login-portal";
import { getSession } from "@/lib/auth/session-server";

export default function HomePage() {
  const user = getSession();

  if (user) {
    redirect("/dashboard");
  }

  return <LoginPortal />;
}
