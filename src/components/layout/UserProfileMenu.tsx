"use client";

import { LogOut, Package, Settings, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

import { logoutAction } from "@/app/actions/auth";
import { useSession } from "@/components/providers/session-provider";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function UserProfileMenu() {
  const router = useRouter();
  const { user, isManager, roleLabel } = useSession();

  const submitLogout = () => {
    (document.getElementById("logout-form") as HTMLFormElement | null)?.requestSubmit();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "h-9 gap-2 border-border/80 bg-card px-2 md:h-10 md:px-3",
          isManager && "border-amber-200/80 bg-amber-50/40 hover:bg-amber-50/70",
        )}
        aria-label="Menu profil"
      >
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md",
            isManager ? "bg-amber-100 text-amber-800" : "bg-primary/15 text-primary",
          )}
        >
          <ShieldCheck className="h-4 w-4" aria-hidden />
        </span>
        <Badge
          variant="outline"
          className={cn(
            "inline-flex max-w-[7.5rem] truncate border-amber-300 bg-amber-50 px-2 py-0 text-[11px] font-semibold text-amber-900 sm:max-w-none",
            !isManager && "border-primary/30 bg-primary/10 text-primary",
          )}
        >
          {roleLabel}
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-semibold">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
          <Badge variant="secondary" className="mt-2 gap-1 text-[10px] font-semibold uppercase tracking-wide">
            <ShieldCheck className="h-3 w-3" aria-hidden />
            {roleLabel}
            {isManager ? " · accès total" : " · terrain"}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isManager ? (
          <>
            <DropdownMenuItem className="gap-2 text-xs" onSelect={() => router.push("/stock")}>
              <Package className="h-4 w-4" />
              Stock &amp; Pièces
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-xs" onSelect={() => router.push("/maintenance-orders")}>
              <Settings className="h-4 w-4" />
              Ordres de maintenance
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem className="gap-2 text-xs" onSelect={() => router.push("/maintenance-orders")}>
            <Settings className="h-4 w-4" />
            Ordres de maintenance (consultation)
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="gap-2 text-xs" onSelect={submitLogout}>
          <LogOut className="h-4 w-4" />
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
      <form id="logout-form" action={logoutAction} className="hidden" />
    </DropdownMenu>
  );
}
