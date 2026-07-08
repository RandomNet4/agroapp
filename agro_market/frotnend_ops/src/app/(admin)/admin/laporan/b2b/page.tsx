"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Package,
  Calendar,
  Loader2,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Weight,
  Banknote,
  ShoppingCart,
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { apiClient } from "@/lib/api-client";
import { formatRupiah } from "@/lib/ecommerce-api";
import { useAuthStore } from "@/store/auth-store";

// ─── Tipe periode ──────────────────────────────────────────────────────────────
type PeriodKey = "today" | "week" | "month" | "last_month" | "3months" | "all";

interface PeriodOption {
  key: PeriodKey;
  label: string;
  short: string;
}

const PERIODS: PeriodOption[] = [
  { key: "today", label: "Hari Ini", short: "Hari Ini" },
  { key: "week", label: "Minggu Ini", short: "7 Hari" },
  { key: "month", label: "Bulan Ini", short: "Bln Ini" },
  { key: "last_month", label: "Bulan Lalu", short: "Bln Lalu" },
  { key: "3months", label: "3 Bulan", short: "3 Bln" },
  { key: "all", label: "Semua Waktu", short: "Semua" },
];

function getDateRange(period: PeriodKey): {
  startDate?: string;
  endDate?: string;
} {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().split("T")[0];

  if (period === "today") return { startDate: iso(now), endDate: iso(now) };
  if (period === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    return { startDate: iso(start), endDate: iso(now) };
  }
  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate: iso(start), endDate: iso(now) };
  }
  if (period === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { startDate: iso(start), endDate: iso(end) };
  }
  if (period === "3months") {
    const start = new Date(now);
    start.setMonth(now.getMonth() - 3);
    return { startDate: iso(start), endDate: iso(now) };
  }
  return {};
}

interface B2BSummary {
  totalTonaseKg: number;
  pendapatanPokokSbu: number;
  totalPesananB2b: number;
  totalKeuntunganSeller: number;
}

export default function LaporanGlobalB2BPage() {
  const router = useRouter();
  const { _hasHydrated, isAuthenticated, user } = useAuthStore();

  const [activePeriod, setActivePeriod] = useState<PeriodKey>("all");
  const [summary, setSummary] = useState<B2BSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSummary = useCallback(async (period: PeriodKey) => {
    setLoading(true);
    try {
      const range = getDateRange(period);
      const params = new URLSearchParams();
      if (range.startDate) params.append("startDate", range.startDate);
      if (range.endDate) params.append("endDate", range.endDate);

      const res = await apiClient.get(
        `/ecommerce/profit-report/admin/b2b-summary?${params.toString()}`,
      );
      setSummary(res.data?.data || res.data);
    } catch {
      toast.error("Gagal memuat ringkasan B2B");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (user?.role !== "SUPER_ADMIN" && user?.role !== "ADMIN_CS") {
      toast.error("Akses ditolak.");
      router.push("/");
      return;
    }

    loadSummary(activePeriod);
  }, [_hasHydrated, isAuthenticated, user, router, activePeriod, loadSummary]);

  if (!_hasHydrated) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

  const periodLabel =
    PERIODS.find((p) => p.key === activePeriod)?.label ?? "Periode";

  return (
    <div className="space-y-8 pb-12 w-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-2">
          <Package className="text-emerald-600" size={28} /> Laporan Global B2B
          (Grosir)
        </h1>
        <p className="text-gray-500 mt-1">
          Pantau total tonase pengiriman dan pendapatan pokok yang akan masuk ke
          kas SBU dari seluruh pesanan grosir (B2B).
        </p>
      </div>

      {/* Period Filter */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={16} className="text-emerald-600" />
          <span className="text-sm font-semibold text-gray-700">
            Filter Periode Laporan
          </span>
          {loading && (
            <Loader2 size={14} className="animate-spin text-emerald-500 ml-2" />
          )}
          {!loading && (
            <button
              onClick={() => loadSummary(activePeriod)}
              className="ml-auto text-gray-400 hover:text-emerald-600 transition-colors"
              title="Segarkan data"
            >
              <RefreshCw size={16} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setActivePeriod(p.key)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activePeriod === p.key
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                  : "bg-gray-50 text-gray-600 border border-gray-200 hover:border-emerald-300 hover:text-emerald-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Tonase Card */}
        <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-3xl p-6 relative overflow-hidden shadow-lg shadow-emerald-100">
          <div className="flex justify-between items-start mb-4">
            <p className="text-xs font-semibold text-emerald-100 uppercase tracking-widest">
              Total Tonase B2B
            </p>
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm text-white">
              <Weight size={20} />
            </div>
          </div>
          {loading ? (
            <div className="h-10 w-24 rounded-xl animate-pulse bg-white/20" />
          ) : (
            <div className="flex items-end gap-2">
              <p className="text-4xl font-bold text-white tracking-tight">
                {summary?.totalTonaseKg.toLocaleString("id-ID") ?? 0}
              </p>
              <span className="text-emerald-100 font-medium mb-1">Kg</span>
            </div>
          )}
          <p className="text-[10px] text-emerald-100/70 mt-3 font-medium">
            Periode: {periodLabel}
          </p>
        </div>

        {/* Pendapatan Pokok SBU */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 relative overflow-hidden shadow-lg shadow-blue-100">
          <div className="flex justify-between items-start mb-4">
            <p className="text-xs font-semibold text-blue-100 uppercase tracking-widest">
              Pendapatan Kas SBU
            </p>
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm text-white">
              <Banknote size={20} />
            </div>
          </div>
          {loading ? (
            <div className="h-10 w-32 rounded-xl animate-pulse bg-white/20" />
          ) : (
            <p className="text-3xl font-bold text-white tracking-tight break-all">
              {formatRupiah(summary?.pendapatanPokokSbu ?? 0)}
            </p>
          )}
          <p className="text-[10px] text-blue-100/70 mt-3 font-medium">
            Nilai Harga Gudang yang ditagihkan
          </p>
        </div>

        {/* Total Keuntungan Seller */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-6 relative overflow-hidden shadow-lg shadow-amber-100">
          <div className="flex justify-between items-start mb-4">
            <p className="text-xs font-semibold text-amber-100 uppercase tracking-widest">
              Keuntungan Seller B2B
            </p>
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm text-white">
              <TrendingUp size={20} />
            </div>
          </div>
          {loading ? (
            <div className="h-10 w-32 rounded-xl animate-pulse bg-white/20" />
          ) : (
            <p className="text-3xl font-bold text-white tracking-tight break-all">
              {formatRupiah(summary?.totalKeuntunganSeller ?? 0)}
            </p>
          )}
          <p className="text-[10px] text-amber-100/70 mt-3 font-medium">
            Estimasi Margin Seller dari B2B
          </p>
        </div>

        {/* Total Pesanan */}
        <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-lg shadow-slate-200">
          <div className="flex justify-between items-start mb-4">
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest">
              Total Pesanan B2B
            </p>
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm text-white">
              <ShoppingCart size={20} />
            </div>
          </div>
          {loading ? (
            <div className="h-10 w-16 rounded-xl animate-pulse bg-white/10" />
          ) : (
            <div className="flex items-end gap-2">
              <p className="text-4xl font-bold text-white tracking-tight">
                {summary?.totalPesananB2b ?? 0}
              </p>
              <span className="text-slate-400 font-medium mb-1">Pesanan</span>
            </div>
          )}
          <p className="text-[10px] text-slate-400/70 mt-3 font-medium">
            Bypass logistik SBU
          </p>
        </div>
      </div>
    </div>
  );
}
