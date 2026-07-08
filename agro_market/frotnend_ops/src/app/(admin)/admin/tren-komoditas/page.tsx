"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  RefreshCw,
  BarChart3,
  Users,
  DollarSign,
  Package,
} from "lucide-react";

import {
  analyticsApi,
  type TrenKomoditasGlobalItem,
  type TrenKomoditasGlobalResponse,
} from "@/lib/api/analytics";

type SortKey = "terjual" | "tren" | "harga" | "seller";

export default function TrenKomoditasGlobalPage() {
  const [data, setData] = useState<TrenKomoditasGlobalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("terjual");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await analyticsApi.getTrenKomoditasGlobal();
      setData(result);
    } catch (err: any) {
      setError(err.message || "Gagal memuat data tren komoditas global");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sortedData = React.useMemo(() => {
    if (!data?.data) return [];
    const items = [...data.data];
    switch (sortBy) {
      case "terjual":
        return items.sort(
          (a, b) => b.jumlahTerjualKgBulanIni - a.jumlahTerjualKgBulanIni,
        );
      case "tren":
        return items.sort(
          (a, b) => (b.trendPersen ?? 0) - (a.trendPersen ?? 0),
        );
      case "harga":
        return items.sort(
          (a, b) => b.hargaJualRataRataPerKg - a.hargaJualRataRataPerKg,
        );
      case "seller":
        return items.sort(
          (a, b) => b.jumlahSellerMenjual - a.jumlahSellerMenjual,
        );
      default:
        return items;
    }
  }, [data, sortBy]);

  // Summary stats
  const totalKomoditas = data?.data.length ?? 0;
  const totalTerjualKg =
    data?.data.reduce((s, d) => s + d.jumlahTerjualKgBulanIni, 0) ?? 0;
  const komoditasNaik =
    data?.data.filter((d) => d.trendArah === "UP").length ?? 0;
  const komoditasTurun =
    data?.data.filter((d) => d.trendArah === "DOWN").length ?? 0;

  const fmtKg = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)} ton` : `${n.toFixed(1)} kg`;
  const fmtRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

  const TrendIcon = ({ arah }: { arah: string }) => {
    if (arah === "UP")
      return <TrendingUp size={14} className="text-emerald-600" />;
    if (arah === "DOWN")
      return <TrendingDown size={14} className="text-red-500" />;
    return <Minus size={14} className="text-gray-400" />;
  };

  const trendColor = (arah: string) => {
    if (arah === "UP") return "text-emerald-600";
    if (arah === "DOWN") return "text-red-500";
    return "text-gray-400";
  };

  const trendBg = (arah: string) => {
    if (arah === "UP") return "bg-emerald-50 border-emerald-100";
    if (arah === "DOWN") return "bg-red-50 border-red-100";
    return "bg-gray-50 border-gray-100";
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={22} className="text-emerald-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Tren Komoditas Global
            </h1>
          </div>
          <p className="text-gray-500 text-sm">
            Agregat penjualan komoditas lintas seluruh toko — data sinyal
            permintaan pasar
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors border border-gray-200"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Period info */}
      {data && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <TrendingUp size={18} className="text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-emerald-800 text-sm">
              Periode: {data.periode} vs {data.periodeSebelumnya}
            </p>
            <p className="text-xs text-emerald-600">
              Dihasilkan: {new Date(data.generatedAt).toLocaleString("id-ID")}
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package size={15} className="text-gray-400" />
              <span className="text-xs text-gray-400 font-medium">
                Komoditas
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{totalKomoditas}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 size={15} className="text-gray-400" />
              <span className="text-xs text-gray-400 font-medium">
                Total Terjual
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-800">
              {fmtKg(totalTerjualKg)}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={15} className="text-emerald-500" />
              <span className="text-xs text-gray-400 font-medium">Naik</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {komoditasNaik}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={15} className="text-red-400" />
              <span className="text-xs text-gray-400 font-medium">Turun</span>
            </div>
            <p className="text-2xl font-bold text-red-500">{komoditasTurun}</p>
          </div>
        </div>
      )}

      {/* Sort controls */}
      {data && data.data.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">Urutkan:</span>
          {(
            [
              { key: "terjual", label: "Qty Terjual" },
              { key: "tren", label: "Tren %" },
              { key: "harga", label: "Harga Rata²" },
              { key: "seller", label: "Jml Seller" },
            ] as { key: SortKey; label: string }[]
          ).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sortBy === opt.key
                  ? "bg-emerald-100 text-emerald-700"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2
              size={32}
              className="animate-spin text-emerald-500 mx-auto mb-3"
            />
            <p className="text-sm text-gray-400">
              Memuat data tren komoditas global...
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="text-center py-12 bg-red-50 rounded-2xl border border-red-100">
          <p className="text-red-500 font-medium">Gagal memuat data</p>
          <p className="text-red-400 text-xs mt-1">{error}</p>
          <button
            onClick={fetchData}
            className="mt-3 text-sm text-emerald-600 hover:underline"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* Data Table */}
      {!loading &&
        !error &&
        data &&
        (data.data.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-100">
            <BarChart3 size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">
              Belum ada data tren komoditas
            </p>
            <p className="text-gray-300 text-sm mt-1">
              Pastikan ada transaksi SELESAI dan produk telah dipetakan ke kode
              komoditas global
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
                      Komoditas
                    </th>
                    <th className="text-right px-5 py-3 font-semibold text-gray-500 text-xs">
                      Terjual (Bulan Ini)
                    </th>
                    <th className="text-right px-5 py-3 font-semibold text-gray-500 text-xs">
                      Terjual (Bulan Lalu)
                    </th>
                    <th className="text-center px-5 py-3 font-semibold text-gray-500 text-xs">
                      Tren
                    </th>
                    <th className="text-right px-5 py-3 font-semibold text-gray-500 text-xs">
                      Harga Rata²/kg
                    </th>
                    <th className="text-center px-5 py-3 font-semibold text-gray-500 text-xs">
                      Seller
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sortedData.map((item, idx) => (
                    <tr
                      key={item.kodeKomoditasGlobal}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <span
                          className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                            idx === 0
                              ? "bg-amber-100 text-amber-700"
                              : idx === 1
                                ? "bg-gray-100 text-gray-600"
                                : idx === 2
                                  ? "bg-orange-50 text-orange-600"
                                  : "bg-gray-50 text-gray-400"
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-gray-800">
                          {item.komoditasNama}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {item.kodeKomoditasGlobal}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-gray-700">
                        {fmtKg(item.jumlahTerjualKgBulanIni)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-gray-500">
                        {fmtKg(item.jumlahTerjualKgBulanLalu)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-bold ${trendBg(item.trendArah)}`}
                        >
                          <TrendIcon arah={item.trendArah} />
                          <span className={trendColor(item.trendArah)}>
                            {item.trendArah === "UP" && "+"}
                            {item.trendPersen !== null
                              ? `${item.trendPersen.toFixed(1)}%`
                              : "-"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-gray-700">
                        {fmtRp(item.hargaJualRataRataPerKg)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 text-gray-600">
                          <Users size={12} className="text-gray-400" />
                          {item.jumlahSellerMenjual}
                        </span>
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
