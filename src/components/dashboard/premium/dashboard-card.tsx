import { cn } from "@/lib/utils";

/** Carte dashboard — maquette : blanc, coins prononcés, bordure fine */
export function DashboardCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-100 bg-white p-5 shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}
