import { NextResponse } from "next/server";

export function partImageApiUrl(partId: string): string {
  return `/api/parts/${partId}/image`;
}

export function machineImageApiUrl(machineId: string): string {
  return `/api/machines/${machineId}/image`;
}

export function imageResponseFromStoredUrl(stored: string | null | undefined): NextResponse | null {
  const url = stored?.trim();
  if (!url) return null;

  if (url.startsWith("data:")) {
    const comma = url.indexOf(",");
    if (comma === -1) return null;
    const header = url.slice(0, comma);
    const data = url.slice(comma + 1);
    const mime = header.match(/data:([^;]+)/)?.[1] ?? "image/jpeg";
    const buffer = Buffer.from(data, "base64");
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return NextResponse.redirect(url, 302);
  }

  return null;
}
