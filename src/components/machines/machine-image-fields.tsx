"use client";

import { ImagePlus } from "lucide-react";
import * as React from "react";

import { MachineImageBlock } from "@/components/machines/machine-image-block";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MAX_IMAGE_KB = 900;

async function readLocalImageFile(file: File): Promise<{ ok: true; dataUrl: string } | { ok: false; error: string }> {
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "Format image requis (JPEG, PNG, WebP, GIF)." };
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      if (!dataUrl.startsWith("data:image/") || dataUrl.length > MAX_IMAGE_KB * 1024) {
        resolve({ ok: false, error: "Image trop volumineuse (max. ~900 Ko)." });
        return;
      }
      resolve({ ok: true, dataUrl });
    };
    reader.onerror = () => resolve({ ok: false, error: "Lecture du fichier impossible." });
    reader.readAsDataURL(file);
  });
}

type MachineImageFieldsProps = {
  idPrefix: string;
  imageUrl: string;
  onImageUrlChange: (value: string) => void;
  imageDataUrl: string;
  onImageDataUrlChange: (value: string) => void;
  alt: string;
  disabled?: boolean;
  urlError?: string;
};

export function MachineImageFields({
  idPrefix,
  imageUrl,
  onImageUrlChange,
  imageDataUrl,
  onImageDataUrlChange,
  alt,
  disabled,
  urlError,
}: MachineImageFieldsProps) {
  const fileId = `${idPrefix}-image-file`;
  const urlId = `${idPrefix}-image-url`;
  const [fileName, setFileName] = React.useState("");
  const [fileError, setFileError] = React.useState<string | null>(null);

  const preview = imageDataUrl.trim() || imageUrl.trim() || null;

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await readLocalImageFile(file);
    if (!res.ok) {
      setFileError(res.error);
      e.target.value = "";
      return;
    }
    setFileError(null);
    setFileName(file.name);
    onImageDataUrlChange(res.dataUrl);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor={urlId}>URL de l&apos;image de l&apos;équipement</Label>
        <Input
          id={urlId}
          type="text"
          inputMode="url"
          autoComplete="off"
          placeholder="https://… ou /images/machine.jpg"
          value={imageUrl}
          disabled={disabled}
          onChange={(e) => {
            const next = e.target.value;
            onImageUrlChange(next);
            if (!next.startsWith("data:image/")) {
              onImageDataUrlChange("");
              setFileName("");
              setFileError(null);
            }
          }}
          className="rounded-xl border-slate-200"
        />
        {urlError ? <p className="text-xs text-rose-600">{urlError}</p> : null}
        <p className="text-xs text-slate-500">
          Collez un lien, ou chargez une photo depuis l&apos;appareil. Le fichier choisi s&apos;affiche ci-dessous et est enregistré à la validation.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={fileId}>Choisir un fichier</Label>
        <div className="flex items-center gap-2">
          <ImagePlus className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <Input
            id={fileId}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/*"
            disabled={disabled}
            onChange={(e) => void onFileChange(e)}
            className="h-10 cursor-pointer rounded-xl border-slate-200 bg-white file:mr-3 file:rounded-lg file:border-0 file:bg-[#E8F1FF] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-[#0B2A5B]"
          />
        </div>
        {fileName ? <p className="text-xs text-slate-600">{fileName} — aperçu mis à jour ci-dessous.</p> : null}
        {fileError ? <p className="text-xs text-rose-600">{fileError}</p> : null}
      </div>

      <MachineImageBlock imageUrl={preview} alt={alt || "Aperçu machine"} className="mb-0" />
    </div>
  );
}
