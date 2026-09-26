"use client";

import type { LucideIcon } from "lucide-react";
import { Edit2, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import * as React from "react";

import { GmaoRowCheckbox } from "@/components/gmao/gmao-table";
import { Button } from "@/components/ui/button";
import { isUsableImageSrc } from "@/lib/media/is-usable-image-src";
import { cn } from "@/lib/utils";

export type CatalogCardMeta = {
  icon: LucideIcon;
  text: string;
};

type CatalogEntityCardProps = {
  title: string;
  kicker?: string;
  imageUrl?: string | null;
  fallbackIcon: LucideIcon;
  badge?: ReactNode;
  meta: CatalogCardMeta[];
  footer?: ReactNode;
  selected?: boolean;
  onToggleSelect?: (checked: boolean) => void;
  selectLabel?: string;
  onEdit?: () => void;
  onDelete?: () => void;
};

export function CatalogEntityCard({
  title,
  kicker,
  imageUrl,
  fallbackIcon: FallbackIcon,
  badge,
  meta,
  footer,
  selected,
  onToggleSelect,
  selectLabel,
  onEdit,
  onDelete,
}: CatalogEntityCardProps) {
  const usableSrc = isUsableImageSrc(imageUrl) ? imageUrl!.trim() : "";
  const [broken, setBroken] = React.useState(false);

  React.useEffect(() => {
    setBroken(false);
  }, [usableSrc]);

  const showPhoto = Boolean(usableSrc) && !broken;

  return (
    <article
      className={cn(
        "group overflow-hidden rounded-lg border bg-white shadow-sm transition-all duration-300",
        selected ? "border-[#1F76FB] shadow-md" : "border-slate-200 hover:border-slate-300 hover:shadow-md",
      )}
    >
      <div className="relative h-48 w-full overflow-hidden bg-slate-100">
        {showPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={usableSrc}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            onError={() => setBroken(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
            <FallbackIcon className="h-10 w-10 text-[#1F76FB]/45" strokeWidth={1.25} />
            <span className="text-xs font-medium">Aucune image disponible</span>
          </div>
        )}
        {onToggleSelect ? (
          <div className="absolute left-2 top-2 rounded-md bg-white/90 p-1 shadow-sm">
            <GmaoRowCheckbox
              checked={Boolean(selected)}
              onChange={onToggleSelect}
              ariaLabel={selectLabel ?? `Sélectionner ${title}`}
            />
          </div>
        ) : null}
        {badge ? <div className="absolute right-2 top-2">{badge}</div> : null}
        {onEdit || onDelete ? (
          <div className="absolute right-2 bottom-2 flex gap-1 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            {onEdit ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-blue-600"
                onClick={onEdit}
                aria-label="Modifier"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            ) : null}
            {onDelete ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 border border-slate-200 bg-white text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                onClick={onDelete}
                aria-label="Supprimer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="space-y-3 p-4">
        <div>
          {kicker ? <p className="font-mono text-[10px] uppercase tracking-wide text-slate-500">{kicker}</p> : null}
          <h3 className="line-clamp-2 text-base font-semibold leading-tight text-slate-900">{title}</h3>
        </div>
        <div className="space-y-1.5">
          {meta.slice(0, 3).map((row, index) => {
            const Icon = row.icon;
            return (
              <p key={`${row.text}-${index}`} className="flex items-center gap-1.5 text-sm text-slate-600">
                <Icon className="h-3.5 w-3.5 shrink-0 text-[#1F76FB]" />
                <span className="truncate">{row.text}</span>
              </p>
            );
          })}
        </div>
        {footer ? <div className="flex flex-wrap gap-2 pt-1">{footer}</div> : null}
      </div>
    </article>
  );
}
