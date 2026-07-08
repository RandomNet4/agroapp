"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  Package,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

import {
  useTrenProdukBulanan,
  usePertumbuhanProduk,
} from "@/hooks/seller/useSellerTren";
import { useSellerDashboard } from "@/hooks/seller/useSellerDashboard";
import ProductGrowthCard from "@/components/ecommerce/analytics/ProductGrowthCard";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

const MONTHS_LIST = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Okt" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];

export default function ProdukTrenPage() {
  const { store } = useSellerDashboard();
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(
    currentDate.getMonth() + 1,
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    currentDate.getFullYear(),
  );

  const [periodType, setPeriodType] = useState<
    "WEEK" | "MONTH" | "SIX_MONTHS" | "YEAR"
  >("MONTH");

  const { data: growthData, isLoading: isGrowthLoading } = usePertumbuhanProduk(
    store?.id ?? "",
    periodType,
    selectedMonth,
    selectedYear,
  );
  const { data: topProductsData, isLoading: isTopLoading } =
    useTrenProdukBulanan(
      store?.id ?? "",
      selectedMonth,
      selectedYear,
      10,
      periodType,
    );

  const yearsList = [currentDate.getFullYear() - 1, currentDate.getFullYear()];

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div>
        <Link
          href="/seller/tren"
          className="text-xs text-gray-400 hover:text-emerald-600 inline-flex items-center gap-1 mb-2 font-medium"
        >
          <ArrowLeft size={12} /> Kembali ke Tren Bulanan
        </Link>
        <div className="flex items-center gap-2 mb-1">
          <Package size={22} className="text-emerald-600" />
          <h1 className="text-2xl font-bold text-gray-900">
            Tren & Pertumbuhan Produk
          </h1>
        </div>
        <p className="text-gray-500 text-sm">
          Analisis produk terlaris per bulan serta tingkat pertumbuhan penjualan
          produk toko <strong>{store?.nama}</strong>
        </p>
      </div>

      {/* Section 1: Pertumbuhan Produk */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            🚀 Pertumbuhan Produk Tercepat & Lambat
          </h2>
          <p className="text-xs text-gray-400">
            Perbandingan total revenue{" "}
            {periodType === "WEEK"
              ? "7 hari terakhir vs 7 hari sebelumnya"
              : periodType === "MONTH"
                ? "bulan ini vs bulan sebelumnya"
                : periodType === "SIX_MONTHS"
                  ? "6 bulan terakhir vs 6 bulan sebelumnya"
                  : "tahun ini vs tahun sebelumnya"}{" "}
            untuk mendeteksi tren produk secara cepat
          </p>
        </div>

        {isGrowthLoading ? (
          <div className="flex items-center justify-center py-10 bg-white border border-gray-100 rounded-2xl">
            <Loader2 size={24} className="animate-spin text-emerald-500" />
          </div>
        ) : growthData && growthData.data && growthData.data.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {growthData.data.map((item) => (
              <ProductGrowthCard key={item.produk.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center text-sm text-gray-400">
            <AlertCircle className="mx-auto text-gray-300 mb-1" size={24} />
            Belum ada data pertumbuhan produk yang memadai untuk periode{" "}
            {periodType === "WEEK"
              ? "7 hari terakhir"
              : periodType === "MONTH"
                ? `${MONTHS_LIST.find((m) => m.value === selectedMonth)?.label} ${selectedYear}`
                : periodType === "SIX_MONTHS"
                  ? "6 bulan terakhir"
                  : `Tahun ${selectedYear}`}
            .
          </div>
        )}
      </div>

      {/* Section 2: Top Products Monthly Breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-50">
          <div>
            <h2 className="text-base font-bold text-gray-800">
              📊 Top 10 Produk Terlaris{" "}
              {periodType === "WEEK"
                ? "Mingguan"
                : periodType === "MONTH"
                  ? "Bulanan"
                  : periodType === "SIX_MONTHS"
                    ? "Per 6 Bulan"
                    : "Tahunan"}
            </h2>
            <p className="text-xs text-gray-400">
              Daftar produk paling laku berdasarkan kuantitas penjualan{" "}
              {periodType === "WEEK"
                ? "7 hari terakhir"
                : periodType === "MONTH"
                  ? "bulanan"
                  : periodType === "SIX_MONTHS"
                    ? "6 bulan terakhir"
                    : "tahunan"}
            </p>
          </div>

          {/* Selectors */}
          <div className="flex items-center gap-2">
            <select
              value={periodType}
              onChange={(e) =>
                setPeriodType(
                  e.target.value as "WEEK" | "MONTH" | "SIX_MONTHS" | "YEAR",
                )
              }
              className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 text-xs font-semibold text-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="WEEK">7 Hari Terakhir</option>
              <option value="MONTH">Per Bulan</option>
              <option value="SIX_MONTHS">6 Bulan Terakhir</option>
              <option value="YEAR">Per Tahun</option>
            </select>

            {periodType === "MONTH" && (
              <>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {MONTHS_LIST.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {yearsList.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </>
            )}

            {periodType === "YEAR" && (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {yearsList.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {isTopLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-emerald-500" />
          </div>
        ) : topProductsData &&
          topProductsData.data &&
          topProductsData.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <th className="py-3 px-4 w-16 text-center">Rank</th>
                  <th className="py-3 px-4">Nama Produk</th>
                  <th className="py-3 px-4 text-right">Kuantitas</th>
                  <th className="py-3 px-4 text-right">Revenue</th>
                  <th className="py-3 px-4 text-right">Jumlah Transaksi</th>
                  <th className="py-3 px-4 text-center">
                    Tren vs{" "}
                    {periodType === "WEEK"
                      ? "Minggu Lalu"
                      : periodType === "MONTH"
                        ? "Bulan Lalu"
                        : periodType === "SIX_MONTHS"
                          ? "6 Bulan Lalu"
                          : "Tahun Lalu"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50/50 text-sm">
                {topProductsData.data.map((item) => {
                  const hasTrend =
                    item.trendPersen !== null && item.trendPersen !== undefined;
                  const isUp = hasTrend && item.trendPersen > 0;
                  const isDown = hasTrend && item.trendPersen < 0;

                  return (
                    <tr
                      key={item.produk.id}
                      className="hover:bg-gray-50/30 transition-colors group"
                    >
                      <td className="py-4 px-4 text-center font-bold text-gray-400 group-hover:text-emerald-500 transition-colors">
                        {item.rank === 1
                          ? "🥇"
                          : item.rank === 2
                            ? "🥈"
                            : item.rank === 3
                              ? "🥉"
                              : String(item.rank).padStart(2, "0")}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100/50 group-hover:border-emerald-100 transition-colors">
                            {item.produk.gambarUrl ? (
                              <img
                                src={item.produk.gambarUrl}
                                alt={item.produk.nama}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package size={14} className="text-gray-300" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800 text-sm group-hover:text-emerald-700 transition-colors">
                              {item.produk.nama}
                            </p>
                            {item.produk.kategori && (
                              <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 mt-0.5">
                                {item.produk.kategori.nama}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="font-bold text-gray-800">
                          {(item.jumlahTerjual || 0).toFixed(1)}
                        </span>
                        <span className="text-gray-400 text-xs ml-1">
                          {item.produk.satuan || "kg"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-emerald-600">
                        {formatRupiah(item.totalRevenue || 0)}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="inline-flex items-center justify-center bg-gray-50 px-2.5 py-1 rounded-lg text-xs font-bold text-gray-600">
                          {item.jumlahTransaksi || 0}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        {hasTrend ? (
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg ${
                              isUp
                                ? "bg-emerald-50 text-emerald-600"
                                : isDown
                                  ? "bg-red-50 text-red-600"
                                  : "bg-gray-50 text-gray-500"
                            }`}
                          >
                            {isUp ? (
                              <TrendingUp size={12} strokeWidth={2.5} />
                            ) : isDown ? (
                              <TrendingDown size={12} strokeWidth={2.5} />
                            ) : (
                              <Minus size={12} strokeWidth={2.5} />
                            )}
                            {isUp ? "+" : ""}
                            {item.trendPersen}%
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400 text-sm">
            Tidak ada data penjualan produk untuk periode{" "}
            {periodType === "WEEK"
              ? "7 hari terakhir"
              : periodType === "MONTH"
                ? `${MONTHS_LIST.find((m) => m.value === selectedMonth)?.label} ${selectedYear}`
                : periodType === "SIX_MONTHS"
                  ? "6 bulan terakhir"
                  : `Tahun ${selectedYear}`}
            .
          </div>
        )}
      </div>
    </div>
  );
}
