"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Package,
  TrendingUp,
  TrendingDown,
  Minus,
  Store,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { analyticsApi, type TrenProdukItem } from "@/lib/api/analytics";
import { storesApi } from "@/lib/api/stores";

interface TokoOption {
  id: string;
  nama: string;
}

const fmtRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

export default function TrenPerProdukPage() {
  const [stores, setStores] = useState<TokoOption[]>([]);
  const [selectedToko, setSelectedToko] = useState<string>("");
  const [items, setItems] = useState<TrenProdukItem[]>([]);
  const [periodLabel, setPeriodLabel] = useState<string>("");
  const [loadingStores, setLoadingStores] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const fetchTrenProduk = useCallback(async () => {
    if (!selectedToko) return;
    setLoading(true);
    setError("");
    try {
      const result = await analyticsApi.getTrenProdukBulanan(
        selectedToko,
        undefined,
        undefined,
        15,
      );
      setItems(result?.data ?? []);
      setPeriodLabel(result?.period?.label ?? "");
    } catch (err: any) {
      setError(err.message || "Gagal memuat tren produk.");
    } finally {
      setLoading(false);
    }
  }, [selectedToko]);

  useEffect(() => {
    if (selectedToko) fetchTrenProduk();
  }, [selectedToko, fetchTrenProduk]);

  const TrendIcon = ({ arah }: { arah: string }) => {
    if (arah === "UP")
      return <TrendingUp size={14} className="text-emerald-600" />;
    if (arah === "DOWN")
      return <TrendingDown size={14} className="text-red-500" />;
    return <Minus size={14} className="text-gray-400" />;
  };

  const trendBg = (arah: string) => {
    if (arah === "UP")
      return "bg-emerald-50 border-emerald-100 text-emerald-600";
    if (arah === "DOWN") return "bg-red-50 border-red-100 text-red-500";
    return "bg-gray-50 border-gray-100 text-gray-400";
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Package size={22} className="text-emerald-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Tren Per Produk
            </h1>
          </div>
          <p className="text-gray-500 text-sm">
            Ranking produk terlaris per bulan dengan perbandingan vs bulan
            sebelumnya
          </p>
        </div>
        <button
          onClick={() => fetchTrenProduk()}
          disabled={loading || !selectedToko}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors border border-gray-200"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Store Selector */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <label className="text-xs text-gray-400 font-medium block mb-2 flex items-center gap-1.5">
          <Store size={13} /> Pilih Toko
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

      {/* Period label */}
      {periodLabel && !loading && (
        <p className="text-sm text-gray-600">
          Periode: <strong className="text-gray-800">{periodLabel}</strong>
        </p>
      )}

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

      {/* Table */}
      {!loading &&
        !error &&
        (items.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-100">
            <Package size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">
              Belum ada data produk untuk toko ini
            </p>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs">
                      #
                    </th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs">
                      Produk
                    </th>
                    <th className="text-right px-5 py-3 font-semibold text-gray-500 text-xs">
                      Terjual
                    </th>
                    <th className="text-right px-5 py-3 font-semibold text-gray-500 text-xs">
                      Bulan Lalu
                    </th>
                    <th className="text-center px-5 py-3 font-semibold text-gray-500 text-xs">
                      Tren
                    </th>
                    <th className="text-right px-5 py-3 font-semibold text-gray-500 text-xs">
                      Revenue
                    </th>
                    <th className="text-center px-5 py-3 font-semibold text-gray-500 text-xs">
                      Transaksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((item) => (
                    <tr
                      key={item.produk.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <span
                          className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                            item.rank === 1
                              ? "bg-amber-100 text-amber-700"
                              : item.rank === 2
                                ? "bg-gray-100 text-gray-600"
                                : item.rank === 3
                                  ? "bg-orange-50 text-orange-600"
                                  : "bg-gray-50 text-gray-400"
                          }`}
                        >
                          {item.rank}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-gray-800">
                          {item.produk.nama}
                        </p>
                        {item.produk.kategori && (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {item.produk.kategori.nama}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-gray-700">
                        {item.jumlahTerjual} {item.produk.satuan}
                      </td>
                      <td className="px-5 py-3.5 text-right text-gray-500">
                        {item.prevJumlahTerjual} {item.produk.satuan}
                      </td>
                      <td className="px-5 py-3.5">
                        <div
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-bold ${trendBg(item.trendArah)}`}
                        >
                          <TrendIcon arah={item.trendArah} />
                          {item.trendArah === "UP" && "+"}
                          {item.trendPersen.toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-gray-700">
                        {fmtRp(item.totalRevenue)}
                      </td>
                      <td className="px-5 py-3.5 text-center text-gray-600">
                        {item.jumlahTransaksi}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
    </div>
  );
}
