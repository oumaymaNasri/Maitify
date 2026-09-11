import { cn } from "@/lib/utils";

/** @deprecated Utiliser CorporateCard — conservé pour compatibilité dashboard */
export function GlassCard({ className, children }: { className?: string; children: React.ReactNode; glow?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md",
        className,
      )}
    >
      {children}
    </div>
  );
}
