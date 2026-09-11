"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type TouchSignaturePadProps = {
  className?: string;
  value: string;
  onChange: (dataUrl: string) => void;
};

/**
 * Capture de signature tactique (PNG data-URL). Le parent enregistre la valeur dans un champ caché pour l'action serveur.
 */
export function TouchSignaturePad({ className, value, onChange }: TouchSignaturePadProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const drawing = React.useRef(false);
  const last = React.useRef<{ x: number; y: number } | null>(null);

  const commit = React.useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    onChange(c.toDataURL("image/png"));
  }, [onChange]);

  const clear = React.useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    last.current = null;
    onChange("");
  }, [onChange]);

  React.useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    const w = Math.floor((c.offsetWidth || 320) * dpr);
    const h = Math.floor((c.offsetHeight || 120) * dpr);
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = Math.max(1.5 * dpr, 2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * c.width;
    const y = ((e.clientY - r.top) / r.height) * c.height;
    return { x, y };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx || !last.current) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };

  const endStroke = () => {
    if (drawing.current) {
      drawing.current = false;
      last.current = null;
      commit();
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="sig-canvas">Signature technicien</Label>
        <Button type="button" variant="outline" size="sm" onClick={clear}>
          Effacer
        </Button>
      </div>
      <canvas
        id="sig-canvas"
        ref={canvasRef}
        className="h-32 w-full touch-none rounded-md border border-input bg-white"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        onPointerLeave={endStroke}
      />
      {value ? <p className="text-xs text-muted-foreground">Signature capturée ({Math.round(value.length / 1024)} ko)</p> : null}
    </div>
  );
}
