"use client";

import {
  TrendingUp,
  DollarSign,
  Percent,
  ShoppingCart,
  Loader2,
} from "lucide-react";

import { ProfitSummary } from "@/types/profit-report";

interface ProfitSummaryCardsProps {
  summary?: ProfitSummary;
  loading?: boolean;
}

function fmt(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function ProfitSummaryCards({
  summary,
  loading,
}: ProfitSummaryCardsProps) {
  const cards = [
    {
      label: "Total Keuntungan",
      value: fmt(summary?.totalKeuntungan ?? 0),
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Total Penjualan",
      value: fmt(summary?.totalPenjualan ?? 0),
      icon: DollarSign,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Total Harga Beli",
      value: fmt(summary?.totalHargaBeli ?? 0),
      icon: ShoppingCart,
      color: "text-slate-600",
      bg: "bg-slate-100",
    },
    {
      label: "Rata-rata Margin",
      value: `${(summary?.rataRataMargin ?? 0).toFixed(1)}%`,
      icon: Percent,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ label, value, icon: Icon, color, bg }) => (
        <div
          key={label}
          className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-1.5 rounded-lg ${bg}`}>
              <Icon size={15} className={color} />
            </div>
            <p className="text-xs text-gray-400">{label}</p>
          </div>
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-gray-300" />
              <div className="h-5 w-20 bg-gray-100 rounded animate-pulse" />
            </div>
          ) : (
            <p className={`text-lg font-bold ${color}`}>{value}</p>
          )}
        </div>
      ))}
    </div>
  );
}
