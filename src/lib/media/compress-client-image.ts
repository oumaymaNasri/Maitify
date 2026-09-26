"use client";

const MAX_DATA_URL_CHARS = 700_000;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Lecture de l'image impossible."));
    img.src = src;
  });
}

function canvasToJpegDataUrl(img: HTMLImageElement, maxEdge: number, quality: number): string {
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height, 1));
  const width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
  const height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Compression image indisponible.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

/** Convertit un fichier local en data-URL JPEG compressée, prête à stocker en base. */
export async function compressImageFileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/") && file.type !== "") {
    throw new Error("Format image requis (JPEG, PNG, WebP, GIF).");
  }
  const probe = URL.createObjectURL(file);
  try {
    const img = await loadImage(probe);
    let maxEdge = 1280;
    let quality = 0.82;
    let last = "";
    for (let i = 0; i < 7; i++) {
      last = canvasToJpegDataUrl(img, maxEdge, quality);
      if (last.startsWith("data:image/") && last.length <= MAX_DATA_URL_CHARS) return last;
      quality = Math.max(0.45, quality - 0.1);
      maxEdge = Math.max(480, Math.round(maxEdge * 0.82));
    }
    throw new Error("Image trop volumineuse même après compression (max. ~500 Ko).");
  } finally {
    URL.revokeObjectURL(probe);
  }
}
