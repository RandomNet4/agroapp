"use client";

import type { ProfitReportFilters } from "@/lib/api/profit-report";

interface ProfitReportFiltersProps {
  filters: ProfitReportFilters;
  onFiltersChange: (filters: ProfitReportFilters) => void;
  loading?: boolean;
}

const STATUS_OPTIONS = [
  { label: "Semua Status", value: "" },
  { label: "Menunggu Konfirmasi", value: "MENUNGGU_KONFIRMASI_SELLER" },
  { label: "Menunggu Bayar", value: "MENUNGGU_BAYAR" },
  { label: "Diproses", value: "DIPROSES" },
  { label: "Dikirim", value: "DIKIRIM" },
  { label: "Selesai", value: "SELESAI" },
  { label: "Dibatalkan", value: "DIBATALKAN" },
];

export function ProfitReportFilters({
  filters,
  onFiltersChange,
  loading,
}: ProfitReportFiltersProps) {
  const inputCls = `w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white
    focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all
    disabled:opacity-50 disabled:bg-gray-50`;

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1">
          Dari Tanggal
        </label>
        <input
          type="date"
          disabled={loading}
          value={filters.startDate ? filters.startDate.split("T")[0] : ""}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              startDate: e.target.value || undefined,
              page: 1,
            })
          }
          className={inputCls}
        />
      </div>
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1">
          Sampai Tanggal
        </label>
        <input
          type="date"
          disabled={loading}
          value={filters.endDate ? filters.endDate.split("T")[0] : ""}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              endDate: e.target.value || undefined,
              page: 1,
            })
          }
          className={inputCls}
        />
      </div>
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1">
          Status Pesanan
        </label>
        <select
          disabled={loading}
          value={filters.status || ""}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              status: e.target.value || undefined,
              page: 1,
            })
          }
          className={inputCls}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <button
        disabled={loading}
        onClick={() => onFiltersChange({ page: 1, limit: filters.limit ?? 20 })}
        className="px-4 py-2 text-xs font-medium border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all"
      >
        Reset
      </button>
    </div>
  );
}
