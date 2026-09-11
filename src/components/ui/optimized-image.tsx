"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";

type OptimizedImageProps = {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
};

function isDataUrl(src: string) {
  return src.startsWith("data:");
}

function isLocalPath(src: string) {
  return src.startsWith("/") && !src.startsWith("//");
}

function isRemoteUrl(src: string) {
  return src.startsWith("http://") || src.startsWith("https://");
}

/** next/image avec lazy-load ; data-URL en img natif ; URLs distantes via Image (unoptimized). */
export function OptimizedImage({
  src,
  alt,
  className,
  fill,
  width,
  height,
  sizes = "(max-width: 768px) 100vw, 33vw",
  priority = false,
}: OptimizedImageProps) {
  if (!src) return null;

  if (isDataUrl(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={cn(className, fill && "h-full w-full object-cover")} />
    );
  }

  if (isLocalPath(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill={fill}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        sizes={sizes}
        priority={priority}
        className={cn(fill && "object-cover", className)}
      />
    );
  }

  if (isRemoteUrl(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill={fill}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        sizes={sizes}
        priority={priority}
        unoptimized
        className={cn(fill && "object-cover", className)}
      />
    );
  }

  return null;
}
