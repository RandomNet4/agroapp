"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

import type { TrenBulananItem } from "@/lib/api/analytics";

function formatRupiah(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}rb`;
  return `${n}`;
}

interface TrenBarChartProps {
  data: TrenBulananItem[];
  mode?: "revenue" | "qty";
}

export default function TrenBarChart({
  data,
  mode = "revenue",
}: TrenBarChartProps) {
  if (!data || data.length === 0) return null;

  const values = data.map((d) =>
    mode === "revenue" ? d.totalRevenue : d.totalQty,
  );
  const maxVal = Math.max(...values, 1);

  return (
    <div className="w-full">
      {/* Bar chart */}
      <div className="flex items-end gap-2 h-44 px-1">
        {data.map((item, idx) => {
          const val = mode === "revenue" ? item.totalRevenue : item.totalQty;
          const growth =
            mode === "revenue"
              ? item.growthRevenuePersen
              : item.growthQtyPersen;
          const heightPct = Math.max(4, (val / maxVal) * 100);
          const isLast = idx === data.length - 1;
          const isPositive = growth !== null && growth > 0;
          const isNegative = growth !== null && growth < 0;

          return (
            <div
              key={item.bulan ?? idx}
              className="flex-1 flex flex-col items-center gap-1 group relative"
            >
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                <div className="font-semibold">{item.labelBulan}</div>
                <div>
                  {mode === "revenue"
                    ? `Rp ${formatRupiah(val)}`
                    : `${val.toFixed(1)} kg`}
                </div>
                {growth !== null && (
                  <div
                    className={
                      isPositive
                        ? "text-green-400"
                        : isNegative
                          ? "text-red-400"
                          : "text-gray-400"
                    }
                  >
                    {isPositive ? "+" : ""}
                    {growth}% vs bln lalu
                  </div>
                )}
              </div>

              {/* Bar */}
              <div
                className={`w-full rounded-t-lg transition-all duration-500 relative overflow-hidden ${
                  isLast
                    ? "bg-emerald-500"
                    : isPositive
                      ? "bg-emerald-300"
                      : isNegative
                        ? "bg-red-300"
                        : "bg-gray-300"
                }`}
                style={{ height: `${heightPct}%` }}
              >
                {/* Shimmer on last bar */}
                {isLast && (
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex gap-2 px-1 mt-1">
        {data.map((item, idx) => {
          const label = item.labelBulan ?? item.bulan ?? "";
          const parts = label.split(" ");
          return (
            <div key={item.bulan ?? idx} className="flex-1 text-center">
              <p className="text-[10px] text-gray-400 truncate leading-tight">
                {parts[0] ?? ""}
              </p>
              <p className="text-[10px] text-gray-300">
                {parts[1] ?? ""}
              </p>
            </div>
          );
        })}
      </div>

      {/* Legend: growth indicators */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />{" "}
          Bulan ini
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-emerald-300 inline-block" />{" "}
          Naik
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-red-300 inline-block" /> Turun
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-gray-300 inline-block" />{" "}
          Stabil
        </span>
      </div>
    </div>
  );
}
