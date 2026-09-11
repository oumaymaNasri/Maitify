"use client";

import { HardHat, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { isRedirectError } from "next/dist/client/components/redirect";
import * as React from "react";

import { loginAction } from "@/app/actions/auth";
import type { AppRole } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

type LoginRole = Extract<AppRole, "RESPONSABLE" | "TECHNICIEN">;

const ROLE_OPTIONS: {
  id: LoginRole;
  title: string;
  icon: typeof ShieldCheck;
}[] = [
  {
    id: "RESPONSABLE",
    title: "Espace Directeur",
    icon: ShieldCheck,
  },
  {
    id: "TECHNICIEN",
    title: "Espace Technicien",
    icon: HardHat,
  },
];

export function LoginPortal() {
  const [role, setRole] = React.useState<LoginRole>("RESPONSABLE");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("role", role);

    startTransition(async () => {
      try {
        const result = await loginAction(formData);
        if (result?.ok === false) setError(result.error);
      } catch (error) {
        if (isRedirectError(error)) throw error;
        setError(error instanceof Error ? error.message : "Connexion impossible.");
      }
    });
  };

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      {/* Fond profondeur 3D */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-950 via-[#0a1628] to-[#05101f]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-24 top-[-10%] h-72 w-72 rounded-full bg-[#1F76FB]/30 blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-[-5%] h-80 w-80 rounded-full bg-cyan-500/20 blur-[110px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-56 w-56 -translate-x-1/2 rounded-full bg-indigo-600/15 blur-[90px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(31,118,251,0.12),transparent_55%)]"
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Carte glassmorphism */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/50 backdrop-blur-md transition-all duration-300 sm:p-8">
          <div className="mb-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#94BFFF]">NutriFish Pro</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">Portail GMAO</h1>
            <p className="mt-2 text-sm text-slate-400">Choisissez votre espace de travail</p>
          </div>

          {/* Sélecteur de rôle */}
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ROLE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = role === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setRole(opt.id)}
                  className={cn(
                    "group flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all duration-300",
                    active
                      ? "border-[#1F76FB]/60 bg-[#1F76FB]/15 shadow-lg shadow-[#1F76FB]/20 ring-1 ring-[#1F76FB]/40"
                      : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-300",
                      active ? "bg-[#1F76FB] text-white" : "bg-white/10 text-slate-300 group-hover:bg-white/15",
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className={cn("text-sm font-semibold", active ? "text-white" : "text-slate-200")}>
                    {opt.title}
                  </span>
                </button>
              );
            })}
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <input type="hidden" name="role" value={role} />

            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-medium text-slate-300">
                Identifiant / E-mail
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                  aria-hidden
                />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  placeholder="nom@nutrifish.local"
                  className="h-11 w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-3 text-sm text-white placeholder:text-slate-500 transition-all duration-300 focus:border-[#1F76FB]/60 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#1F76FB]/30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-xs font-medium text-slate-300">
                Mot de passe
              </label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                  aria-hidden
                />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={4}
                  placeholder="••••••••"
                  className="h-11 w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-3 text-sm text-white placeholder:text-slate-500 transition-all duration-300 focus:border-[#1F76FB]/60 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#1F76FB]/30"
                />
              </div>
            </div>

            {error ? (
              <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#1F76FB] text-sm font-semibold text-white shadow-lg shadow-[#1F76FB]/30 transition-all duration-300 hover:bg-[#1865D9] hover:shadow-xl hover:shadow-[#1F76FB]/40 active:scale-[0.98] disabled:opacity-70"
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Connexion…
                </>
              ) : (
                "Se connecter"
              )}
            </button>
          </form>

          <div className="mt-5 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-[11px] leading-relaxed text-slate-400">
            <p className="font-semibold text-slate-300">Comptes de démonstration</p>
            <p className="mt-1">
              Directeur : <span className="text-slate-200">directeur@nutrifish.local</span>
            </p>
            <p>
              Technicien : <span className="text-slate-200">technicien@nutrifish.local</span>
            </p>
            <p className="mt-1">
              Mot de passe (les deux) : <span className="font-mono text-slate-200">Gmao2026!</span>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
