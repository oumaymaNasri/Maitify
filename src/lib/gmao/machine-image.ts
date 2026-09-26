import { isUsableImageSrc } from "@/lib/media/is-usable-image-src";

/** Résout l'URL d'illustration principale (photo triée ou galerie Prisma). */
export function resolveMachineImageUrl(
  photos: { url: string }[],
  galleryImageUrls: string[],
): string | null {
  for (const photo of photos) {
    const url = photo.url?.trim();
    if (isUsableImageSrc(url)) return url;
  }
  for (const entry of galleryImageUrls) {
    const url = entry?.trim();
    if (isUsableImageSrc(url)) return url;
  }
  return null;
}
