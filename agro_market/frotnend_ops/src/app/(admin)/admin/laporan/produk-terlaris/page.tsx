"use client";

import React, { useState } from "react";
import {
  BarChart3,
  Filter,
  Loader2,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

import PeriodFilterBar from "@/components/ecommerce/analytics/PeriodFilterBar";
import KategoriTerlarisCard from "@/components/ecommerce/analytics/KategoriTerlarisCard";
import RiwayatBulananPanel from "@/components/ecommerce/analytics/RiwayatBulananPanel";
import { useProdukTerlaris } from "@/hooks/analytics/useProdukTerlaris";
import type { ProdukTerlarisFilter, SortByType } from "@/lib/api/analytics";

export default function ProdukTerlarisAdminPage() {
  const [period, setPeriod] = useState("MONTH");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState<SortByType>("terjual");
  const [showRiwayat, setShowRiwayat] = useState(false);

  const filters: ProdukTerlarisFilter = {
    period: period as any,
    startDate: period === "CUSTOM" ? startDate : undefined,
    endDate: period === "CUSTOM" ? endDate : undefined,
    sortBy,
    limit: 5,
  };

  const { data, isLoading, isError, refetch } = useProdukTerlaris(
    filters,
    period !== "CUSTOM" || (!!startDate && !!endDate),
  );

  return (
    <div className="space-y-6 pb-10">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={22} className="text-emerald-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Produk Terlaris
            </h1>
          </div>
          <p className="text-gray-500 text-sm">
            Ranking produk terlaris per kategori berdasarkan periode yang
            dipilih
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors border border-gray-200"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-500">
            Filter Periode
          </span>
        </div>
        <PeriodFilterBar
          value={period}
          onChange={setPeriod}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />

        {/* Sort by */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
          <span className="text-xs text-gray-400 font-medium">Urutkan:</span>
          {(["terjual", "revenue", "transaksi"] as SortByType[]).map((opt) => (
            <button
              key={opt}
              onClick={() => setSortBy(opt)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                sortBy === opt
                  ? "bg-emerald-100 text-emerald-700"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {opt === "terjual"
                ? "Qty (kg)"
                : opt === "revenue"
                  ? "Revenue"
                  : "Transaksi"}
            </button>
          ))}
        </div>
      </div>

      {/* Period label */}
      {data && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={15} className="text-emerald-500" />
            <p className="text-sm text-gray-600">
              Periode:{" "}
              <strong className="text-gray-800">{data.period.label}</strong>
              <span className="ml-2 text-gray-400">
                ({data.totalKategori} kategori)
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2
              size={32}
              className="animate-spin text-emerald-500 mx-auto mb-3"
            />
            <p className="text-sm text-gray-400">
              Memuat data produk terlaris...
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="text-center py-12 bg-red-50 rounded-2xl border border-red-100">
          <p className="text-red-500 font-medium">Gagal memuat data</p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-sm text-emerald-600 hover:underline"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* Data Grid */}
      {data &&
        !isLoading &&
        (data.data.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-100">
            <BarChart3 size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">
              Belum ada data penjualan
            </p>
            <p className="text-gray-300 text-sm mt-1">
              Coba pilih periode yang berbeda
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {data.data.map((kategoriData) => (
              <KategoriTerlarisCard
                key={kategoriData.kategori.id}
                data={kategoriData}
                showTrend={false}
              />
            ))}
          </div>
        ))}

      {/* Riwayat Section Toggle */}
      <div className="border-t border-gray-100 pt-6">
        <button
          onClick={() => setShowRiwayat((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
        >
          <span
            className={`transition-transform ${showRiwayat ? "rotate-90" : ""}`}
          >
            ▶
          </span>
          {showRiwayat ? "Sembunyikan" : "Tampilkan"} Riwayat Bulanan
        </button>

        {showRiwayat && <RiwayatBulananPanel />}
      </div>
    </div>
  );
}
