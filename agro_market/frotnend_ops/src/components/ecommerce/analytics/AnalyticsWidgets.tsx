"use client";

import React, { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// ── Mini Bar Chart ─────────────────────────────────────────────────────
interface MiniBarChartProps {
  data: number[];
  color?: string;
  height?: number;
}

export function MiniBarChart({
  data,
  color = "#10b981",
  height = 40,
}: MiniBarChartProps) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[3px]" style={{ height }}>
      {data.map((val, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all duration-300"
          style={{
            height: `${Math.max((val / max) * 100, 4)}%`,
            backgroundColor: i === data.length - 1 ? color : `${color}55`,
          }}
        />
      ))}
    </div>
  );
}

// ── Trend Badge ────────────────────────────────────────────────────────
interface TrendBadgeProps {
  value: number;
  suffix?: string;
}

export function TrendBadge({ value, suffix = "%" }: TrendBadgeProps) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
        <Minus className="w-2.5 h-2.5" />
        Stabil
      </span>
    );
  }
  const isUp = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
        isUp ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600"
      }`}
    >
      {isUp ? (
        <TrendingUp className="w-2.5 h-2.5" />
      ) : (
        <TrendingDown className="w-2.5 h-2.5" />
      )}
      {isUp ? "+" : ""}
      {value.toFixed(1)}
      {suffix}
    </span>
  );
}

// ── Analytics Card ────────────────────────────────────────────────────
interface AnalyticsCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  trendLabel?: string;
  chartData?: number[];
  chartColor?: string;
  icon?: React.ReactNode;
  accentColor?: string;
  onClick?: () => void;
}

export function AnalyticsCard({
  label,
  value,
  subtitle,
  trend,
  trendLabel,
  chartData,
  chartColor = "#10b981",
  icon,
  accentColor = "border-l-emerald-400",
  onClick,
}: AnalyticsCardProps) {
  return (
    <button
      onClick={onClick}
      className={`bg-white border border-gray-100 border-l-2 ${accentColor} rounded-2xl p-4 text-left w-full hover:shadow-md transition-all duration-200 active:scale-[0.98] group`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10.5px] text-gray-400 uppercase tracking-wider font-bold truncate">
            {label}
          </p>
          <p className="text-[20px] font-extrabold text-gray-900 leading-tight mt-0.5 tracking-tight truncate">
            {value}
          </p>
          {subtitle && (
            <p className="text-[10px] text-gray-400 mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
        {icon && (
          <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-100 transition-colors">
            {icon}
          </div>
        )}
      </div>

      {chartData && chartData.length > 0 && (
        <div className="mb-2">
          <MiniBarChart data={chartData} color={chartColor} height={36} />
        </div>
      )}

      {trend !== undefined && (
        <div className="flex items-center gap-1.5 mt-1">
          <TrendBadge value={trend} />
          {trendLabel && (
            <span className="text-[10px] text-gray-400">{trendLabel}</span>
          )}
        </div>
      )}
    </button>
  );
}

// ── Status Distribution Bar ───────────────────────────────────────────
interface StatusDistItem {
  label: string;
  count: number;
  color: string;
}

export function StatusDistributionBar({ items }: { items: StatusDistItem[] }) {
  const total = items.reduce((s, i) => s + i.count, 0);
  if (total === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
        {items.map((item, i) => (
          <div
            key={i}
            className={`${item.color} transition-all`}
            style={{ width: `${(item.count / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${item.color}`} />
            <span className="text-[10px] text-gray-500 font-medium">
              {item.label}{" "}
              <span className="font-bold text-gray-700">{item.count}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Compute 7-day bar chart from orders ──────────────────────────────
export function compute7DayChart(
  orders: any[],
  dateField = "createdAt",
): number[] {
  const counts = Array(7).fill(0);
  const now = new Date();
  orders.forEach((o) => {
    const d = new Date(o[dateField] || o.tanggalDibuat || "");
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays >= 0 && diffDays < 7) {
      counts[6 - diffDays]++;
    }
  });
  return counts;
}

// ── Compute trend % vs yesterday ────────────────────────────────────
export function computeTrend(orders: any[], dateField = "createdAt"): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let todayCount = 0;
  let yesterdayCount = 0;

  orders.forEach((o) => {
    const d = new Date(o[dateField] || o.tanggalDibuat || "");
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) todayCount++;
    else if (d.getTime() === yesterday.getTime()) yesterdayCount++;
  });

  if (yesterdayCount === 0) return todayCount > 0 ? 100 : 0;
  return ((todayCount - yesterdayCount) / yesterdayCount) * 100;
}
