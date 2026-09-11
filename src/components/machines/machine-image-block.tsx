"use client";

import { Factory } from "lucide-react";

import { OptimizedImage } from "@/components/ui/optimized-image";
import { cn } from "@/lib/utils";

type MachineImageBlockProps = {
  imageUrl?: string | null;
  alt: string;
  className?: string;
};

export function MachineImageBlock({ imageUrl, alt, className }: MachineImageBlockProps) {
  if (imageUrl) {
    return (
      <div
        className={cn(
          "relative mb-4 h-48 w-full overflow-hidden rounded-xl border border-slate-100 shadow-sm",
          className,
        )}
      >
        <OptimizedImage src={imageUrl} alt={alt} fill sizes="(max-width: 640px) 100vw, 480px" className="object-cover" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mb-4 flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-400",
        className,
      )}
    >
      <Factory className="h-10 w-10 text-[#1F76FB]/50" strokeWidth={1.25} aria-hidden />
      <span className="text-xs font-medium">Aucune image disponible</span>
    </div>
  );
}
