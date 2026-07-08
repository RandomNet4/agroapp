"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  Package,
  Calendar,
  Loader2,
  Download,
  TrendingUp,
  ArrowDownUp,
  BarChart3,
  FileSpreadsheet,
  Percent,
  ShoppingCart,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import {
  ordersApi,
  storesApi,
  formatRupiah,
  formatTanggal,
} from "@/lib/ecommerce-api";
import { extractArray } from "@/lib/api-helpers";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import { fetchProfitSummary } from "@/lib/api/profit-report";

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
  { key: "all", label: "Semua", short: "Semua" },
];

function getDateRange(period: PeriodKey): {
  startDate?: string;
  endDate?: string;
} {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().split("T")[0];

  if (period === "today") {
    return { startDate: iso(now), endDate: iso(now) };
  }
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
  return {}; // 'all' — tanpa filter tanggal
}

interface ProfitSummary {
  totalKeuntungan: number;
  totalPenjualan: number;
  totalHargaBeli: number;
  rataRataMargin: number;
  produkTerlaris?: { produk: { nama: string }; jumlahTerjual: number }[];
}

interface FinanceOrder {
  id?: string;
  totalHarga?: number | string;
  totalAmount?: number | string;
  status?: string;
  tanggalDibuat?: string;
  createdAt?: string;
  items?: unknown[];
  customer?: { name?: string };
  pembeli?: string;
  metodeBayar?: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LaporanKeuanganPage() {
  const router = useRouter();
  const { _hasHydrated, isAuthenticated } = useAuthStore();

  const [tokoId, setTokoId] = useState<string | null>(null);
  const [orders, setOrders] = useState<FinanceOrder[]>([]);
  const [baseLoading, setBaseLoading] = useState(true);

  // ── Profit summary (period filter) ─────────────────────────────────────────
  type OrderFilterType = "ALL" | "RETAIL" | "B2B";
  const [activePeriod, setActivePeriod] = useState<PeriodKey>("month");
  const [orderType, setOrderType] = useState<OrderFilterType>("ALL");
  const [summary, setSummary] = useState<ProfitSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // ── Download states ─────────────────────────────────────────────────────────
  const [orderStartDate, setOrderStartDate] = useState("");
  const [orderEndDate, setOrderEndDate] = useState("");
  const [stockStartDate, setStockStartDate] = useState("");
  const [stockEndDate, setStockEndDate] = useState("");
  const [downloadingOrders, setDownloadingOrders] = useState(false);
  const [downloadingStock, setDownloadingStock] = useState(false);

  const fetchOrders = useCallback(async (id: string, type: OrderFilterType) => {
    try {
      const isGrosir =
        type === "B2B" ? true : type === "RETAIL" ? false : undefined;
      const ordersRes = await ordersApi.sellerGetOrders(id, {
        isGrosir,
        limit: 1000,
      });
      const rawList =
        ordersRes?.data?.data?.data ||
        ordersRes?.data?.data ||
        ordersRes?.data ||
        [];
      const list: FinanceOrder[] = Array.isArray(rawList) ? rawList : [];
      setOrders(
        [...list].sort(
          (a, b) =>
            new Date(b.tanggalDibuat || b.createdAt || "").getTime() -
            new Date(a.tanggalDibuat || a.createdAt || "").getTime(),
        ),
      );
    } catch {
      toast.error("Gagal memuat daftar pesanan");
    }
  }, []);

  // ── Initial data load ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    const init = async () => {
      try {
        const storeRes = await storesApi.getMyStore();
        const storeData =
          extractArray(storeRes)[0] || storeRes?.data?.data || storeRes?.data;
        const id = storeData?.id;
        if (!id) {
          setBaseLoading(false);
          return;
        }
        setTokoId(id);
      } catch {
        toast.error("Gagal memuat profil toko");
      } finally {
        setBaseLoading(false);
      }
    };
    init();
  }, [_hasHydrated, isAuthenticated, router]);

  useEffect(() => {
    if (tokoId) {
      fetchOrders(tokoId, orderType);
    }
  }, [tokoId, orderType, fetchOrders]);

  // ── Fetch profit summary setiap kali period atau tokoId berubah ─────────────
  const loadSummary = useCallback(
    async (period: PeriodKey, id: string, type: OrderFilterType) => {
      setSummaryLoading(true);
      try {
        const range: any = getDateRange(period);
        if (type === "B2B") range.isB2B = true;
        else if (type === "RETAIL") range.isB2B = false;

        const res = await fetchProfitSummary(id, range);
        // TransformInterceptor: { success, data: { ... } }
        const data = (res as any)?.data ?? res;
        setSummary(data as ProfitSummary);
      } catch {
        setSummary(null);
      } finally {
        setSummaryLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (tokoId) loadSummary(activePeriod, tokoId, orderType);
  }, [tokoId, activePeriod, orderType, loadSummary]);

  // ── Download helpers ────────────────────────────────────────────────────────
  const applyOrderPreset = (days: number) => {
    if (days === 0) {
      setOrderStartDate("");
      setOrderEndDate("");
      return;
    }
    const end = new Date(),
      start = new Date();
    start.setDate(end.getDate() - days);
    setOrderStartDate(start.toISOString().split("T")[0]);
    setOrderEndDate(end.toISOString().split("T")[0]);
  };

  const applyStockPreset = (days: number) => {
    if (days === 0) {
      setStockStartDate("");
      setStockEndDate("");
      return;
    }
    const end = new Date(),
      start = new Date();
    start.setDate(end.getDate() - days);
    setStockStartDate(start.toISOString().split("T")[0]);
    setStockEndDate(end.toISOString().split("T")[0]);
  };

  const handleDownloadOrders = async () => {
    if (!tokoId) {
      toast.error("ID Toko tidak ditemukan.");
      return;
    }
    setDownloadingOrders(true);
    const tid = toast.loading("Menyiapkan Laporan Transaksi...");
    try {
      const res = await apiClient.get(
        `/ecom-pesanan/penjual/${tokoId}/laporan/excel`,
        {
          params: {
            startDate: orderStartDate || undefined,
            endDate: orderEndDate || undefined,
          },
          responseType: "blob",
        },
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Laporan_Transaksi_${orderStartDate || "semua"}.xlsx`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Laporan Transaksi diunduh!", { id: tid });
    } catch {
      toast.error("Gagal mengunduh laporan.", { id: tid });
    } finally {
      setDownloadingOrders(false);
    }
  };

  const handleDownloadStock = async () => {
    if (!tokoId) {
      toast.error("ID Toko tidak ditemukan.");
      return;
    }
    setDownloadingStock(true);
    const tid = toast.loading("Menyiapkan Laporan Mutasi Stok...");
    try {
      const res = await apiClient.get(
        `/ecom-produk/penjual/${tokoId}/laporan-stok/excel`,
        {
          params: {
            startDate: stockStartDate || undefined,
            endDate: stockEndDate || undefined,
          },
          responseType: "blob",
        },
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Laporan_Stok_${stockStartDate || "semua"}.xlsx`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Laporan Mutasi Stok diunduh!", { id: tid });
    } catch {
      toast.error("Gagal mengunduh laporan stok.", { id: tid });
    } finally {
      setDownloadingStock(false);
    }
  };

  if (!_hasHydrated || baseLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-emerald-600" size={24} />
      </div>
    );
  }

  const periodLabel =
    PERIODS.find((p) => p.key === activePeriod)?.label ?? "Periode";

  return (
    <div className="space-y-8 w-full">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <h1 className="text-2xl font-medium text-slate-800 flex items-center gap-3">
            <BarChart3 className="text-emerald-600" size={22} /> Laporan &
            Analitik
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Ringkasan keuntungan per periode dan unduh laporan Excel.
          </p>
        </div>
      </div>

      {/* ── Order Type Tabs ── */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { key: "ALL", label: "Semua Pesanan" },
          { key: "RETAIL", label: "Eceran (Toko)" },
          { key: "B2B", label: "Grosir (B2B Gudang)" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setOrderType(tab.key as OrderFilterType)}
            className={`px-5 py-2 text-xs font-medium rounded-lg transition-all ${
              orderType === tab.key
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Period Filter ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={15} className="text-slate-400" />
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Filter Periode
          </span>
          {summaryLoading && (
            <Loader2 size={13} className="animate-spin text-emerald-500" />
          )}
          {!summaryLoading && tokoId && (
            <button
              onClick={() => loadSummary(activePeriod, tokoId, orderType)}
              className="ml-1 text-slate-400 hover:text-emerald-600 transition-colors"
            >
              <RefreshCw size={13} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setActivePeriod(p.key)}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                activePeriod === p.key
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-200"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-emerald-300 hover:text-emerald-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: `Keuntungan · ${periodLabel}`,
            value: formatRupiah(summary?.totalKeuntungan ?? 0),
            icon: <TrendingUp size={18} />,
            color: "from-emerald-500 to-teal-600",
            text: "text-white",
            sub: "text-emerald-100",
          },
          {
            label: `Omset Penjualan · ${periodLabel}`,
            value: formatRupiah(summary?.totalPenjualan ?? 0),
            icon: <DollarSign size={18} />,
            color: "from-blue-500 to-indigo-600",
            text: "text-white",
            sub: "text-blue-100",
          },
          {
            label: `HPP (Harga Beli) · ${periodLabel}`,
            value: formatRupiah(summary?.totalHargaBeli ?? 0),
            icon: <ShoppingCart size={18} />,
            color: "from-slate-100 to-slate-200",
            text: "text-slate-800",
            sub: "text-slate-500",
          },
          {
            label: `Margin Rata-rata · ${periodLabel}`,
            value: `${(summary?.rataRataMargin ?? 0).toFixed(1)}%`,
            icon: <Percent size={18} />,
            color: "from-amber-400 to-orange-500",
            text: "text-white",
            sub: "text-amber-100",
          },
        ].map((card) => (
          <div
            key={card.label}
            className={`bg-gradient-to-br ${card.color} rounded-2xl p-5 relative overflow-hidden`}
          >
            <div className={`flex justify-between items-start mb-3`}>
              <p
                className={`text-[11px] font-medium ${card.sub} leading-tight`}
              >
                {card.label}
              </p>
              <div className={`opacity-70 ${card.text}`}>{card.icon}</div>
            </div>
            {summaryLoading ? (
              <div
                className={`h-8 w-24 rounded-lg animate-pulse ${card.text === "text-white" ? "bg-white/20" : "bg-slate-300/40"}`}
              />
            ) : (
              <p
                className={`text-2xl font-semibold ${card.text} tracking-tight`}
              >
                {card.value}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Produk terlaris di periode ini */}
      {summary?.produkTerlaris && summary.produkTerlaris.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
            <Package size={15} className="text-emerald-600" />
            Produk Terlaris · {periodLabel}
          </h3>
          <div className="space-y-2">
            {summary.produkTerlaris.slice(0, 5).map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm text-slate-700 flex-1 truncate">
                  {item.produk?.nama ?? "—"}
                </span>
                <span className="text-xs font-medium text-emerald-600">
                  {item.jumlahTerjual} kg
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Total pesanan (semua waktu, from orders table) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium mb-1">
            Total Pesanan Masuk (Semua Waktu)
          </p>
          <p className="text-3xl font-medium text-slate-800">{orders.length}</p>
          <p className="text-[10px] text-slate-400 mt-2">
            Semua pesanan yang pernah masuk ke toko Anda
          </p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium mb-1">
            Pesanan Selesai (Semua Waktu)
          </p>
          <p className="text-3xl font-medium text-emerald-700">
            {
              orders.filter((o) =>
                ["selesai", "SELESAI", "DELIVERED"].includes(o.status || ""),
              ).length
            }
          </p>
          <p className="text-[10px] text-slate-400 mt-2">
            Pesanan yang sudah selesai dan terkirim
          </p>
        </div>
      </div>

      {/* ── Download Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Laporan Transaksi */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h3 className="font-medium text-slate-800 text-sm">
                Laporan Transaksi
              </h3>
              <p className="text-[11px] text-slate-500">
                Data pembeli, produk, ongkir, total
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {["Tanggal Mulai", "Tanggal Selesai"].map((label, i) => (
              <div key={label}>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">
                  {label}
                </label>
                <input
                  type="date"
                  value={i === 0 ? orderStartDate : orderEndDate}
                  onChange={(e) =>
                    i === 0
                      ? setOrderStartDate(e.target.value)
                      : setOrderEndDate(e.target.value)
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 focus:outline-none focus:border-emerald-400 transition-all"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-1.5 mb-5">
            {[
              [7, "7 Hari"],
              [30, "30 Hari"],
              [0, "Semua"],
            ].map(([d, l]) => (
              <button
                key={l}
                onClick={() => applyOrderPreset(d as number)}
                className="px-2.5 py-1 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-600 text-slate-500 text-[10px] font-medium rounded-lg border border-slate-200 transition-all"
              >
                {l}
              </button>
            ))}
          </div>
          <button
            onClick={handleDownloadOrders}
            disabled={downloadingOrders}
            className="mt-auto w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {downloadingOrders ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Mengekspor...
              </>
            ) : (
              <>
                <Download size={13} /> Unduh (.xlsx)
              </>
            )}
          </button>
        </div>

        {/* Laporan Mutasi Stok */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
              <ArrowDownUp size={18} />
            </div>
            <div>
              <h3 className="font-medium text-slate-800 text-sm">
                Laporan Mutasi Stok
              </h3>
              <p className="text-[11px] text-slate-500">
                Riwayat keluar masuk barang
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {["Tanggal Mulai", "Tanggal Selesai"].map((label, i) => (
              <div key={label}>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">
                  {label}
                </label>
                <input
                  type="date"
                  value={i === 0 ? stockStartDate : stockEndDate}
                  onChange={(e) =>
                    i === 0
                      ? setStockStartDate(e.target.value)
                      : setStockEndDate(e.target.value)
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 focus:outline-none focus:border-teal-400 transition-all"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-1.5 mb-5">
            {[
              [7, "7 Hari"],
              [30, "30 Hari"],
              [0, "Semua"],
            ].map(([d, l]) => (
              <button
                key={l}
                onClick={() => applyStockPreset(d as number)}
                className="px-2.5 py-1 bg-slate-50 hover:bg-teal-50 hover:text-teal-600 text-slate-500 text-[10px] font-medium rounded-lg border border-slate-200 transition-all"
              >
                {l}
              </button>
            ))}
          </div>
          <button
            onClick={handleDownloadStock}
            disabled={downloadingStock}
            className="mt-auto w-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {downloadingStock ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Mengekspor...
              </>
            ) : (
              <>
                <Download size={13} /> Unduh (.xlsx)
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Tabel Riwayat Pesanan ── */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
        <div className="p-5 border-b border-slate-100 bg-slate-50/30">
          <h2 className="font-medium text-slate-800 text-sm">
            Riwayat Pesanan Masuk
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Semua pesanan real-time dari toko Anda
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 text-[11px]">
                {["ID Pesanan", "Tanggal", "Customer", "Total", "Status"].map(
                  (h) => (
                    <th
                      key={h}
                      className={`py-3 px-5 font-medium uppercase tracking-wider ${h === "Total" ? "text-right" : h === "Status" ? "text-center" : "text-left"}`}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="text-slate-600">
              {orders.map((order, idx) => (
                <tr
                  key={order.id || idx}
                  onClick={() =>
                    order.id && router.push(`/seller/pesanan/${order.id}`)
                  }
                  className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors cursor-pointer"
                >
                  <td className="py-3.5 px-5">
                    <span className="font-mono text-emerald-600">
                      #{(order.id || "").substring(0, 8).toUpperCase()}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {order.items?.length ?? 0} item
                    </div>
                  </td>
                  <td className="py-3.5 px-5 text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} className="text-slate-400" />
                      {formatTanggal(
                        order.tanggalDibuat || order.createdAt || "",
                      )}
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    <p className="text-slate-800 font-medium max-w-[160px] truncate">
                      {order.customer?.name || order.pembeli || "Customer"}
                    </p>
                    {order.metodeBayar && (
                      <p className="text-[9px] text-slate-400 uppercase tracking-wider mt-0.5">
                        {order.metodeBayar.replace("_", " ")}
                      </p>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-right font-medium text-slate-800">
                    {formatRupiah(order.totalHarga || order.totalAmount || 0)}
                  </td>
                  <td className="py-3.5 px-5 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[9px] font-medium uppercase tracking-wider ${
                        ["selesai", "SELESAI", "DELIVERED"].includes(
                          order.status || "",
                        )
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          : ["dibatalkan", "CANCELLED", "DIBATALKAN"].includes(
                                order.status || "",
                              )
                            ? "bg-red-50 text-red-500 border border-red-100"
                            : ["dikirim", "SHIPPED", "DIKIRIM"].includes(
                                  order.status || "",
                                )
                              ? "bg-blue-50 text-blue-600 border border-blue-100"
                              : "bg-amber-50 text-amber-600 border border-amber-100"
                      }`}
                    >
                      {order.status || "MENUNGGU"}
                    </span>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-14 text-slate-400">
                    <Package size={26} className="mx-auto mb-2" />
                    <p className="text-xs font-medium">
                      Belum ada riwayat pesanan
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
