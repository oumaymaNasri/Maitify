import { cn } from "@/lib/utils";

/** Carte institutionnelle — fond blanc, bordure fine, ombre légère */
export function CorporateCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 bg-white shadow-sm transition-all duration-300",
        "hover:border-slate-300 hover:shadow-md",
        className,
      )}
    >
      {children}
    </div>
  );
}
