"use client";

import { PencilLine } from "lucide-react";
import * as React from "react";

import { SearchableVirtualSelect } from "@/components/gmao/searchable-virtual-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type BulkEditFieldOption = {
  value: string;
  label: string;
};

export type BulkEditField = {
  id: string;
  label: string;
  kind: "text" | "select" | "search";
  options?: BulkEditFieldOption[];
  placeholder?: string;
  allowClear?: boolean;
};

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

type BulkEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  selectedCount: number;
  fields: BulkEditField[];
  pending?: boolean;
  onApply: (fieldId: string, value: string) => Promise<{ ok: true } | { ok: false; error: string }>;
};

function resolveSearchValue(raw: string, options: BulkEditFieldOption[]): string | null {
  const needle = raw.trim().toLowerCase();
  if (!needle) return "";
  const byValue = options.find((opt) => opt.value === raw.trim());
  if (byValue) return byValue.value;
  const exact = options.filter((opt) => opt.label.trim().toLowerCase() === needle && opt.value);
  if (exact.length === 1) return exact[0]!.value;
  const partial = options.filter((opt) => opt.value && opt.label.toLowerCase().includes(needle));
  if (partial.length === 1) return partial[0]!.value;
  return null;
}

export function BulkEditDialog({
  open,
  onOpenChange,
  title = "Modifier la sélection",
  selectedCount,
  fields,
  pending = false,
  onApply,
}: BulkEditDialogProps) {
  const [fieldId, setFieldId] = React.useState(fields[0]?.id ?? "");
  const [value, setValue] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const field = fields.find((item) => item.id === fieldId) ?? fields[0];

  React.useEffect(() => {
    if (!open) return;
    setFieldId(fields[0]?.id ?? "");
    setValue("");
    setSearchQuery("");
    setError(null);
  }, [open]);

  React.useEffect(() => {
    setValue("");
    setSearchQuery("");
    setError(null);
  }, [fieldId]);

  const options = React.useMemo(() => {
    const list = field?.options ?? [];
    if (field?.allowClear && !list.some((opt) => opt.value === "")) {
      return [{ value: "", label: "Effacer la valeur" }, ...list];
    }
    return list;
  }, [field]);

  async function apply() {
    if (!field || pending) return;
    if (selectedCount === 0) {
      setError("Cochez au moins une ligne dans le tableau.");
      return;
    }

    let nextValue = value;
    if (field.kind === "search") {
      const resolved = resolveSearchValue(value || searchQuery, options);
      if (resolved === null) {
        setError("Choisissez un intervenant dans la liste.");
        return;
      }
      nextValue = resolved;
    } else if (field.kind === "select" && nextValue === "" && !field.allowClear) {
      setError("Choisissez une valeur.");
      return;
    }

    setError(null);
    const result = await onApply(field.id, nextValue);
    if (!result.ok) {
      setError(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void apply();
          }}
          className="grid gap-4"
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Appliquer la même valeur à{" "}
              <span className="font-semibold tabular-nums text-slate-800">{selectedCount}</span> ligne
              {selectedCount > 1 ? "s" : ""} sélectionnée{selectedCount > 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="bulk-edit-field">Colonne à modifier</Label>
            <select
              id="bulk-edit-field"
              className={SELECT_CLASS}
              value={field?.id ?? ""}
              disabled={pending}
              onChange={(event) => setFieldId(event.target.value)}
            >
              {fields.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bulk-edit-value">Nouvelle valeur</Label>
            {field?.kind === "search" ? (
              <SearchableVirtualSelect
                id="bulk-edit-value"
                value={value}
                onValueChange={setValue}
                onQueryChange={setSearchQuery}
                options={options}
                placeholder={field.placeholder ?? "Rechercher…"}
                disabled={pending}
              />
            ) : field?.kind === "select" ? (
              <select
                id="bulk-edit-value"
                className={SELECT_CLASS}
                value={value}
                disabled={pending}
                onChange={(event) => setValue(event.target.value)}
              >
                <option value="" disabled={!field.allowClear}>
                  {field.placeholder ?? "Choisir…"}
                </option>
                {options
                  .filter((opt) => opt.value !== "")
                  .map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
              </select>
            ) : (
              <Input
                id="bulk-edit-value"
                value={value}
                disabled={pending}
                placeholder={field?.placeholder ?? "Saisir la valeur"}
                list={field?.options?.length ? `bulk-edit-${field.id}` : undefined}
                onChange={(event) => setValue(event.target.value)}
              />
            )}
            {field?.kind === "text" && field.options?.length ? (
              <datalist id={`bulk-edit-${field.id}`}>
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value} />
                ))}
              </datalist>
            ) : null}
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-[#1F76FB] hover:bg-[#1a65d6]"
              disabled={pending || selectedCount === 0}
              onClick={(event) => {
                event.preventDefault();
                void apply();
              }}
            >
              <PencilLine className="mr-2 h-4 w-4" />
              {pending ? "Mise à jour…" : "Appliquer à la sélection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
