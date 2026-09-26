/** True when the value can be used as an <img src> (not a Windows path / fakepath). */
export function isUsableImageSrc(src: string | null | undefined): boolean {
  const value = src?.trim() ?? "";
  if (!value) return false;
  if (value.includes("fakepath") || /^[a-zA-Z]:[\\/]/.test(value)) return false;
  if (value.startsWith("data:image/") && value.includes(",")) return true;
  if (value.startsWith("blob:")) return true;
  if (value.startsWith("http://") || value.startsWith("https://")) return true;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  return false;
}
