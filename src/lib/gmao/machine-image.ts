/** Résout l'URL d'illustration principale (photo triée ou galerie Prisma). */
export function resolveMachineImageUrl(
  photos: { url: string }[],
  galleryImageUrls: string[],
): string | null {
  const fromPhoto = photos[0]?.url?.trim();
  if (fromPhoto) return fromPhoto;
  const fromGallery = galleryImageUrls[0]?.trim();
  return fromGallery || null;
}
