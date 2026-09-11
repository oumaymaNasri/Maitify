"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";

import { BRAND_BLUE } from "@/lib/brand";
import type { SparkPoint } from "@/lib/gmao/dashboard-premium-data";
import { cn } from "@/lib/utils";

export function DashboardSparkline({
  data,
  className,
  height = 40,
}: {
  data: SparkPoint[];
  className?: string;
  height?: number;
}) {
  return (
    <div className={cn("w-full min-w-[72px]", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="dashSpark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BRAND_BLUE} stopOpacity={0.3} />
              <stop offset="100%" stopColor={BRAND_BLUE} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={BRAND_BLUE}
            fill="url(#dashSpark)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
