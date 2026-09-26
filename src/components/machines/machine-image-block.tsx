"use client";

import { Factory } from "lucide-react";
import * as React from "react";

import { isUsableImageSrc } from "@/lib/media/is-usable-image-src";
import { cn } from "@/lib/utils";

type MachineImageBlockProps = {
  imageUrl?: string | null;
  alt: string;
  className?: string;
};

export function MachineImageBlock({ imageUrl, alt, className }: MachineImageBlockProps) {
  const src = isUsableImageSrc(imageUrl) ? imageUrl!.trim() : "";
  const [broken, setBroken] = React.useState(false);

  React.useEffect(() => {
    setBroken(false);
  }, [src]);

  if (src && !broken) {
    return (
      <div
        className={cn(
          "relative mb-4 h-48 w-full overflow-hidden rounded-xl border border-slate-100 bg-slate-100 shadow-sm",
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
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
