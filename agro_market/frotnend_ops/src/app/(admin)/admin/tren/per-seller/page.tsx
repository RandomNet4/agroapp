"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  Store,
  Loader2,
  RefreshCw,
  BarChart3,
} from "lucide-react";

import { analyticsApi, type TrenBulananResponse } from "@/lib/api/analytics";
import { storesApi } from "@/lib/api/stores";
import TrenBarChart from "@/components/ecommerce/analytics/TrenBarChart";

interface TokoOption {
  id: string;
  nama: string;
}

function fmt(n: number) {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return `Rp ${n}`;
}

export default function TrenPerSellerPage() {
  const [stores, setStores] = useState<TokoOption[]>([]);
  const [selectedToko, setSelectedToko] = useState<string>("");
  const [data, setData] = useState<TrenBulananResponse | null>(null);
  const [loadingStores, setLoadingStores] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chartMode, setChartMode] = useState<"revenue" | "qty">("revenue");

  // Ambil daftar toko untuk dropdown
  useEffect(() => {
    const fetchStores = async () => {
      try {
        setLoadingStores(true);
        const res = await storesApi.adminGetAll({ limit: 200 });
        const raw = res?.data?.data || res?.data || [];
        const list: TokoOption[] = Array.isArray(raw)
          ? raw
          : (raw.data ?? raw.items ?? []);
        setStores(list);
        if (list.length > 0) setSelectedToko(list[0].id);
      } catch (err) {
        console.error("Error fetching stores:", err);
        setError("Gagal memuat daftar toko.");
      } finally {
        setLoadingStores(false);
      }
    };
    fetchStores();
  }, []);

  const fetchTren = useCallback(async () => {
    if (!selectedToko) return;
    setLoading(true);
    setError("");
    try {
      const result = await analyticsApi.getTrenBulanan(selectedToko, 6);
      setData(result);
    } catch (err: any) {
      setError(err.message || "Gagal memuat tren penjualan seller.");
    } finally {
      setLoading(false);
    }
  }, [selectedToko]);

  useEffect(() => {
    if (selectedToko) fetchTren();
  }, [selectedToko, fetchTren]);

  const lastMonth = data?.summary?.bulanTerakhir;
  const bestMonth = data?.summary?.bulanTerbaik;
  const displayMonth =
    (lastMonth?.jumlahTransaksi ?? 0) > 0 ? lastMonth : bestMonth;
  const growth = lastMonth?.growthRevenuePersen;
  const isUp = growth !== null && growth !== undefined && growth > 0;
  const isDown = growth !== null && growth !== undefined && growth < 0;
  const chartData = data?.data ?? [];

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Store size={22} className="text-emerald-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Tren Per Seller
            </h1>
          </div>
          <p className="text-gray-500 text-sm">
            Analisis tren penjualan bulanan untuk setiap toko / seller
          </p>
        </div>
        <button
          onClick={() => fetchTren()}
          disabled={loading || !selectedToko}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors border border-gray-200"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Store Selector */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <label className="text-xs text-gray-400 font-medium block mb-2">
          Pilih Toko
        </label>
        {loadingStores ? (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 size={16} className="animate-spin" /> Memuat daftar toko...
          </div>
        ) : (
          <select
            value={selectedToko}
            onChange={(e) => setSelectedToko(e.target.value)}
            className="w-full md:w-96 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
          >
            {stores.length === 0 && <option value="">Tidak ada toko</option>}
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-emerald-500" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="text-center py-12 bg-red-50 rounded-2xl border border-red-100">
          <p className="text-red-500 font-medium">Gagal memuat data</p>
          <p className="text-red-400 text-xs mt-1">{error}</p>
        </div>
      )}

      {/* Summary */}
      {!loading && !error && displayMonth && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-medium text-gray-400 mb-1">
              Revenue Bulan Ini
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {fmt(displayMonth.totalRevenue)}
            </p>
            {growth !== null && (
              <div
                className={`flex items-center gap-1 mt-1.5 text-sm font-medium ${isUp ? "text-green-600" : isDown ? "text-red-500" : "text-gray-400"}`}
              >
                {isUp ? (
                  <TrendingUp size={14} />
                ) : isDown ? (
                  <TrendingDown size={14} />
                ) : null}
                {isUp ? "+" : ""}
                {growth}% vs bulan lalu
              </div>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-medium text-gray-400 mb-1">
              Qty Terjual
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {displayMonth.totalQty.toFixed(1)}{" "}
              <span className="text-base text-gray-400">kg</span>
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-medium text-gray-400 mb-1">
              Jumlah Transaksi
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {displayMonth.jumlahTransaksi}{" "}
              <span className="text-base text-gray-400">pesanan</span>
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      {!loading && !error && chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-800">
              6 Bulan Terakhir
            </h2>
            <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1 border border-gray-100">
              {(["revenue", "qty"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setChartMode(m)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${chartMode === m ? "bg-white shadow-sm text-emerald-700" : "text-gray-400"}`}
                >
                  {m === "revenue" ? "Revenue" : "Qty (kg)"}
                </button>
              ))}
            </div>
          </div>
          <TrenBarChart data={chartData} mode={chartMode} />
        </div>
      )}

      {/* Empty */}
      {!loading && !error && data && chartData.length === 0 && (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-100">
          <BarChart3 size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">
            Belum ada data tren untuk toko ini
          </p>
        </div>
      )}
    </div>
  );
}
