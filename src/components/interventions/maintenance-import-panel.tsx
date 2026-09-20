"use client";

import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import * as React from "react";

import { dispatchOmNotice } from "@/components/gmao/om-notice-host";
import { GMAO_TABLE_HEAD, GMAO_TABLE_WRAP } from "@/components/gmao/table-styles";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  EXCEL_MAINTENANCE_FIELDS,
  mappingCoverage,
  previewMappedRows,
  type ExcelColumnMapping,
  type ExcelMaintenanceFieldKey,
} from "@/lib/gmao/excel-maintenance-columns";
import { cn } from "@/lib/utils";

type ParseResponse = {
  fileName: string;
  headers: string[];
  rowCount: number;
  skippedEmpty: number;
  suggestedMapping: ExcelColumnMapping;
  sampleRaw: Record<string, string>[];
  preview: Record<ExcelMaintenanceFieldKey, string>[];
  error?: string;
};

type ImportResponse = {
  ok?: boolean;
  inserted?: number;
  skipped?: number;
  catalogTotal?: number;
  om?: { days: number; created: number; linked: number };
  error?: string;
};

const UNMAPPED = "__none__";

export function MaintenanceImportPanel({ onImported }: { onImported?: () => void }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const fileRef = React.useRef<File | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [busy, setBusy] = React.useState<"parse" | "import" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [parsed, setParsed] = React.useState<ParseResponse | null>(null);
  const [mapping, setMapping] = React.useState<ExcelColumnMapping | null>(null);
  const [result, setResult] = React.useState<ImportResponse | null>(null);

  const coverage = mapping ? mappingCoverage(mapping) : null;

  const parseFile = React.useCallback(async (file: File) => {
    fileRef.current = file;
    setError(null);
    setResult(null);
    setBusy("parse");
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/interventions/import/parse", { method: "POST", body });
      const data = (await res.json()) as ParseResponse;
      if (!res.ok) throw new Error(data.error || "Lecture Excel impossible.");
      setParsed(data);
      setMapping(data.suggestedMapping);
    } catch (e) {
      setParsed(null);
      setMapping(null);
      setError(e instanceof Error ? e.message : "Lecture Excel impossible.");
    } finally {
      setBusy(null);
    }
  }, []);

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file) void parseFile(file);
  };

  const runImport = async () => {
    if (!fileRef.current || !mapping) return;
    if (!mapping.date) {
      setError("Associez au moins la colonne Date avant d'importer.");
      return;
    }
    setBusy("import");
    setError(null);
    try {
      const body = new FormData();
      body.set("file", fileRef.current);
      body.set("mapping", JSON.stringify(mapping));
      const res = await fetch("/api/interventions/import", { method: "POST", body });
      const data = (await res.json()) as ImportResponse;
      if (!res.ok || !data.ok) throw new Error(data.error || "Import impossible.");
      setResult(data);
      dispatchOmNotice({
        created: (data.om?.created ?? 0) > 0,
        reference: `${data.om?.created ?? 0} OM Auto`,
        dayKey: new Date().toISOString().slice(0, 10),
        importSummary: {
          inserted: data.inserted ?? 0,
          skipped: data.skipped ?? 0,
          omCreated: data.om?.created ?? 0,
          omLinked: data.om?.linked ?? 0,
          days: data.om?.days ?? 0,
          catalogTotal: data.catalogTotal ?? 0,
        },
      });
      onImported?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import impossible.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Importer un planning de maintenances</p>
          <p className="text-sm text-slate-600">
            Les nouvelles lignes s&apos;ajoutent aux 10 281 existantes. Chaque date crée ou complète l&apos;OM
            journalier (préventif et correctif).
          </p>
        </div>
        <a
          href="/api/interventions/import/template"
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <FileSpreadsheet className="h-4 w-4 text-[#1F76FB]" />
          Télécharger le modèle Excel
        </a>
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition",
          dragOver ? "border-[#1F76FB] bg-[#E8F1FF]" : "border-slate-200 bg-white hover:border-[#1F76FB]/50 hover:bg-slate-50",
        )}
      >
        <Upload className="mb-3 h-8 w-8 text-[#1F76FB]" />
        <p className="text-sm font-medium text-slate-800">Glissez-déposez le fichier Excel ici</p>
        <p className="mt-1 text-xs text-slate-500">.xlsx — janvier à décembre, 19 colonnes du modèle officiel</p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void parseFile(file);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4 rounded-xl"
          onClick={(e) => {
            e.preventDefault();
            inputRef.current?.click();
          }}
        >
          Choisir un fichier
        </Button>
      </label>

      {busy === "parse" ? (
        <p className="flex items-center gap-2 text-sm text-[#1F76FB]">
          <Loader2 className="h-4 w-4 animate-spin" /> Lecture des en-têtes…
        </p>
      ) : null}
      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      {parsed && mapping ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{parsed.fileName}</span>
            {" · "}
            {parsed.rowCount.toLocaleString("fr-FR")} ligne(s) utiles
            {coverage ? ` · ${coverage.mapped}/${coverage.total} colonnes associées` : null}
          </p>

          <div className={GMAO_TABLE_WRAP}>
            <Table>
              <TableHeader>
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead className={GMAO_TABLE_HEAD}>Champ GMAO</TableHead>
                  <TableHead className={GMAO_TABLE_HEAD}>Colonne Excel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {EXCEL_MAINTENANCE_FIELDS.map((field) => (
                  <TableRow key={field.key} className="border-slate-100">
                    <TableCell className="font-medium text-slate-800">
                      {field.header}
                      {field.key === "date" ? <span className="ml-1 text-rose-600">*</span> : null}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={mapping[field.key] ?? UNMAPPED}
                        onValueChange={(value) =>
                          setMapping((prev) =>
                            prev ? { ...prev, [field.key]: value === UNMAPPED ? null : value } : prev,
                          )
                        }
                      >
                        <SelectTrigger className="h-9 max-w-md border-slate-200 bg-white">
                          <SelectValue placeholder="Ignorer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UNMAPPED}>Ignorer cette colonne</SelectItem>
                          {parsed.headers.map((header) => (
                            <SelectItem key={`${field.key}-${header}`} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {parsed.preview.length > 0 ? (
            <div className={cn(GMAO_TABLE_WRAP, "overflow-x-auto")}>
              <p className="border-b border-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Aperçu (premières lignes)
              </p>
              <Table>
                <TableHeader>
                  <TableRow className="border-0 hover:bg-transparent">
                    <TableHead className={GMAO_TABLE_HEAD}>Date</TableHead>
                    <TableHead className={GMAO_TABLE_HEAD}>Machine</TableHead>
                    <TableHead className={GMAO_TABLE_HEAD}>Type</TableHead>
                    <TableHead className={GMAO_TABLE_HEAD}>Intervenant</TableHead>
                    <TableHead className={GMAO_TABLE_HEAD}>Secteur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewMappedRows(parsed.sampleRaw ?? [], mapping).map((row, i) => (
                    <TableRow key={i} className="border-slate-100">
                      <TableCell>{row.date || "—"}</TableCell>
                      <TableCell>{row.machineName || "—"}</TableCell>
                      <TableCell>{row.maintenanceType || "—"}</TableCell>
                      <TableCell>{row.intervenant || "—"}</TableCell>
                      <TableCell>{row.sectorMaintenance || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}

          <Button
            type="button"
            disabled={busy !== null || !mapping.date}
            onClick={() => void runImport()}
            className="rounded-xl bg-[#1F76FB] hover:bg-[#1865D9]"
          >
            {busy === "import" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Valider le mappage et importer
          </Button>
        </div>
      ) : null}

      {result?.ok ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {result.inserted?.toLocaleString("fr-FR")} ligne(s) ajoutée(s)
          {result.skipped ? ` · ${result.skipped} ignorée(s)` : ""} · catalogue{" "}
          {result.catalogTotal?.toLocaleString("fr-FR")} · {result.om?.created ?? 0} OM Auto créé(s) ·{" "}
          {result.om?.linked ?? 0} rattachement(s).
        </p>
      ) : null}
    </div>
  );
}
