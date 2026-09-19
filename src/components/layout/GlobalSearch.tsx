"use client";

import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { useSession } from "@/components/providers/session-provider";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GlobalSearchResponse, GlobalSearchScope } from "@/lib/gmao/global-search-types";
import { cn } from "@/lib/utils";

const SCOPES: { value: GlobalSearchScope; label: string; managerOnly?: boolean }[] = [
  { value: "all", label: "Tout" },
  { value: "machines", label: "Machines" },
  { value: "maintenance", label: "Maintenance" },
  { value: "stock", label: "Stock", managerOnly: true },
];

const EMPTY: GlobalSearchResponse = { machines: [], maintenance: [], parts: [] };

function ResultSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-1">
      <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <ul>{children}</ul>
    </div>
  );
}

function ResultRow({
  title,
  subtitle,
  onSelect,
}: {
  title: string;
  subtitle: string;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors hover:bg-[#E8F1FF]/60 focus-visible:bg-[#E8F1FF]/60 focus-visible:outline-none"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onSelect}
      >
        <span className="truncate text-sm font-medium text-slate-900">{title}</span>
        <span className="truncate text-xs text-slate-500">{subtitle}</span>
      </button>
    </li>
  );
}

export function GlobalSearch({ className, tone = "light" }: { className?: string; tone?: "light" | "onDark" }) {
  const router = useRouter();
  const { isManager } = useSession();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [q, setQ] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const [scope, setScope] = React.useState<GlobalSearchScope>("all");
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState<GlobalSearchResponse>(EMPTY);
  const abortRef = React.useRef<AbortController | null>(null);

  const scopeOptions = React.useMemo(
    () => SCOPES.filter((s) => !s.managerOnly || isManager),
    [isManager],
  );

  React.useEffect(() => {
    if (!isManager && scope === "stock") setScope("all");
  }, [isManager, scope]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(q.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [q]);

  React.useEffect(() => {
    if (debouncedQ.length < 3) {
      abortRef.current?.abort();
      setResults(EMPTY);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    const params = new URLSearchParams({ q: debouncedQ, scope });
    fetch(`/api/search/global?${params.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Recherche indisponible.");
        return res.json() as Promise<GlobalSearchResponse>;
      })
      .then((data) => {
        if (!controller.signal.aborted) setResults(data);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (!controller.signal.aborted) setResults(EMPTY);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [debouncedQ, scope]);

  React.useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onTouchStart = (e: TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("touchstart", onTouchStart);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("touchstart", onTouchStart);
    };
  }, []);

  const totalHits = results.machines.length + results.maintenance.length + results.parts.length;
  const showPanel = open && debouncedQ.length >= 3;

  const navigate = React.useCallback(
    (href: string) => {
      setOpen(false);
      setQ("");
      setDebouncedQ("");
      inputRef.current?.blur();
      router.push(href);
    },
    [router],
  );

  return (
    <div ref={rootRef} className={cn("relative min-w-0 flex-1", className)}>
      <div
        className={cn(
          "flex h-8 w-full items-center gap-1 rounded-lg border pl-2 pr-1 shadow-sm transition-shadow focus-within:ring-2",
          tone === "onDark"
            ? "border-white/20 bg-white/10 focus-within:ring-white/25"
            : "border-slate-200 bg-white focus-within:ring-blue-600/20",
          showPanel && "rounded-b-none border-b-transparent shadow-md",
        )}
      >
        <Search className={cn("h-4 w-4 shrink-0", tone === "onDark" ? "text-sky-200" : "text-slate-500")} aria-hidden />
        <Input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (q.trim().length >= 3) setOpen(true);
          }}
          placeholder="Recherche globale…"
          className={cn(
            "h-7 flex-1 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0 sm:text-sm",
            tone === "onDark" && "text-white placeholder:text-sky-200/80",
          )}
          aria-label="Recherche globale"
          aria-expanded={showPanel}
          aria-controls="global-search-results"
          autoComplete="off"
        />
        <Select value={scope} onValueChange={(v) => setScope(v as GlobalSearchScope)}>
          <SelectTrigger
            className={cn(
              "h-6 w-[5.25rem] shrink-0 border-0 text-xs shadow-none",
              tone === "onDark" ? "bg-white/15 text-white" : "bg-slate-100 text-slate-800",
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {scopeOptions.map((s) => (
              <SelectItem key={s.value} value={s.value} className="text-xs">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showPanel ? (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 overflow-hidden rounded-b-lg border border-t-0 border-slate-200 bg-white shadow-lg"
        >
          <ScrollArea className="max-h-[min(22rem,60vh)]">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Recherche…
              </div>
            ) : totalHits === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">Aucun résultat pour cette recherche.</p>
            ) : (
              <div className="pb-1">
                {results.machines.length > 0 ? (
                  <ResultSection label="🖥️ Machines">
                    {results.machines.map((hit) => (
                      <ResultRow
                        key={`machine-${hit.id}`}
                        title={hit.title}
                        subtitle={hit.subtitle}
                        onSelect={() => navigate(hit.href)}
                      />
                    ))}
                  </ResultSection>
                ) : null}

                {results.maintenance.length > 0 ? (
                  <ResultSection label="📋 Ordres & Interventions">
                    {results.maintenance.map((hit) => (
                      <ResultRow
                        key={`${hit.kind}-${hit.id}`}
                        title={hit.title}
                        subtitle={hit.subtitle}
                        onSelect={() => navigate(hit.href)}
                      />
                    ))}
                  </ResultSection>
                ) : null}

                {results.parts.length > 0 ? (
                  <ResultSection label="📦 Stock & Pièces">
                    {results.parts.map((hit) => (
                      <ResultRow
                        key={`part-${hit.id}`}
                        title={hit.title}
                        subtitle={hit.subtitle}
                        onSelect={() => navigate(hit.href)}
                      />
                    ))}
                  </ResultSection>
                ) : null}
              </div>
            )}
          </ScrollArea>
        </div>
      ) : null}
    </div>
  );
}
