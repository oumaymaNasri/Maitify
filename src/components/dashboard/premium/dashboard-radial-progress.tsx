"use client";

import { BRAND_BLUE } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** Jauge semi-circulaire — maquette disponibilité parc */
export function DashboardRadialGauge({
  value,
  size = 140,
  className,
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const stroke = 10;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2 + 8;
  const halfCirc = Math.PI * r;
  const offset = halfCirc - (pct / 100) * halfCirc;

  return (
    <div className={cn("relative flex flex-col items-center", className)} style={{ width: size, height: size * 0.65 }}>
      <svg width={size} height={size * 0.58} viewBox={`0 0 ${size} ${size * 0.58}`} className="overflow-visible">
        <path
          d={`M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <path
          d={`M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`}
          fill="none"
          stroke={BRAND_BLUE}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${halfCirc} ${halfCirc}`}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute bottom-0 text-center">
        <p className="text-3xl font-bold tabular-nums text-slate-900">{pct}%</p>
        <p className="text-xs text-slate-500">Objectif ≥ 92%</p>
      </div>
    </div>
  );
}
