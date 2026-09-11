"use client";

import { Loader2 } from "lucide-react";
import * as React from "react";

import { adjustStockAction } from "@/app/actions/part";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { PartInventoryRow } from "@/lib/gmao/stock-parts-query";

type StockAdjustDialogProps = {
  part: PartInventoryRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdjusted?: (partId: string, newQuantity: number) => void;
};

export function StockAdjustDialog({ part, open, onOpenChange, onAdjusted }: StockAdjustDialogProps) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [type, setType] = React.useState<"ENTREE" | "SORTIE">("ENTREE");
  const [quantity, setQuantity] = React.useState("1");
  const [motif, setMotif] = React.useState("");

  React.useEffect(() => {
    if (open && part) {
      setType("ENTREE");
      setQuantity("1");
      setMotif("");
      setError(null);
    }
  }, [open, part]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!part) return;
    setPending(true);
    setError(null);

    const fd = new FormData();
    fd.set("partId", part.id);
    fd.set("type", type);
    fd.set("quantity", quantity);
    fd.set("motif", motif);

    const res = await adjustStockAction(fd);
    setPending(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    const qty = Math.max(1, Math.floor(Number(quantity) || 0));
    const newQty = type === "ENTREE" ? part.quantity + qty : part.quantity - qty;
    onAdjusted?.(part.id, newQty);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajuster le stock</DialogTitle>
          <DialogDescription>
            {part ? (
              <>
                <span className="font-medium text-slate-900">{part.designation}</span>
                <span className="text-slate-500"> — stock actuel : {part.quantity}</span>
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Type de mouvement</Label>
            <Select value={type} onValueChange={(v) => setType(v as "ENTREE" | "SORTIE")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ENTREE">Entrée (réception)</SelectItem>
                <SelectItem value="SORTIE">Sortie (consommation)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adjust-qty">Quantité</Label>
            <Input
              id="adjust-qty"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adjust-motif">Motif</Label>
            <Textarea
              id="adjust-motif"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder={type === "ENTREE" ? "Ex. Achat, Réception commande…" : "Ex. Utilisation atelier…"}
              rows={2}
            />
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending} className="bg-[#1F76FB] hover:bg-[#1a65d6]">
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
