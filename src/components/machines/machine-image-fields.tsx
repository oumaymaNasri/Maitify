"use client";

import { ImagePlus } from "lucide-react";
import * as React from "react";

import { MachineImageBlock } from "@/components/machines/machine-image-block";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { compressImageFileToDataUrl } from "@/lib/media/compress-client-image";

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
  const [converting, setConverting] = React.useState(false);
  const [blobPreview, setBlobPreview] = React.useState<string | null>(null);

  React.useEffect(() => {
    return () => {
      if (blobPreview) URL.revokeObjectURL(blobPreview);
    };
  }, [blobPreview]);

  const encoded = imageDataUrl.trim() || (imageUrl.startsWith("data:image/") ? imageUrl : "");
  const preview = blobPreview || encoded || imageUrl.trim() || null;
  const urlIsData = imageUrl.startsWith("data:image/");

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (blobPreview) URL.revokeObjectURL(blobPreview);
    const instant = URL.createObjectURL(file);
    setBlobPreview(instant);
    setFileName(file.name);
    setFileError(null);
    setConverting(true);
    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      onImageDataUrlChange(dataUrl);
      onImageUrlChange(dataUrl);
    } catch (err) {
      onImageDataUrlChange("");
      setFileError(err instanceof Error ? err.message : "Conversion de l'image impossible.");
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor={urlId}>URL de l&apos;image de l&apos;équipement</Label>
        {urlIsData ? (
          <Input
            id={urlId}
            type="text"
            readOnly
            disabled={disabled}
            value={`data:image/jpeg;base64,… (${Math.max(1, Math.round(imageUrl.length / 1024))} Ko)`}
            className="rounded-xl border-slate-200 bg-slate-50 font-mono text-xs"
          />
        ) : (
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
                if (blobPreview) {
                  URL.revokeObjectURL(blobPreview);
                  setBlobPreview(null);
                }
              }
            }}
            className="rounded-xl border-slate-200"
          />
        )}
        {urlIsData ? (
          <p className="text-xs text-emerald-700">
            Fichier converti en Base64 — référence valide injectée, prête à l’enregistrement (ce n’est pas un chemin
            C:\fakepath).
          </p>
        ) : (
          <p className="text-xs text-slate-500">Collez un lien public, ou chargez un fichier ci-dessous.</p>
        )}
        {urlError ? <p className="text-xs text-rose-600">{urlError}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor={fileId}>Choisir un fichier</Label>
        <div className="flex items-center gap-2">
          <ImagePlus className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <Input
            id={fileId}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/*"
            disabled={disabled || converting}
            onChange={(e) => void onFileChange(e)}
            className="h-10 cursor-pointer rounded-xl border-slate-200 bg-white file:mr-3 file:rounded-lg file:border-0 file:bg-[#E8F1FF] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-[#0B2A5B]"
          />
        </div>
        {fileName ? (
          <p className="text-xs text-slate-600">
            {fileName}
            {converting ? " — conversion en cours…" : " — image convertie et prévisualisée."}
          </p>
        ) : null}
        {fileError ? <p className="text-xs text-rose-600">{fileError}</p> : null}
      </div>

      <MachineImageBlock imageUrl={preview} alt={alt || "Aperçu machine"} className="mb-0" />
    </div>
  );
}
