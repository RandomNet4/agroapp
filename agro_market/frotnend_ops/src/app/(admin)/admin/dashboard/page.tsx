"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Store,
  Package,
  ClipboardList,
  CalendarCheck,
  TrendingUp,
  DollarSign,
  Loader2,
  ArrowRight,
  ShoppingCart,
  Users,
  Activity,
  ArrowUpRight,
  BarChart2,
  Warehouse,
  CheckCircle2,
  XCircle,
  Clock,
  Wifi,
  WifiOff,
  Percent,
  ChevronRight,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import {
  formatRupiah,
  formatTanggal,
  storesApi,
  productsApi,
  ordersApi,
  dashboardApi,
  gudangApi,
} from "@/lib/ecommerce-api";
import { useAuthStore } from "@/store/auth-store";
import {
  AnalyticsCard,
  StatusDistributionBar,
  compute7DayChart,
  computeTrend,
} from "@/components/ecommerce/analytics/AnalyticsWidgets";

interface OrderData {
  id: string;
  customer?: { name?: string };
  pembeli?: string;
  tanggalDibuat?: string;
  createdAt?: string;
  totalHarga?: number | string;
  totalAmount?: number | string;
  status?: string;
}

interface ProductData {
  id: string;
  nama?: string;
  gambarUrl?: string;
  gambar?: string;
  emoji?: string;
  store?: { nama?: string };
  tokoNama?: string;
  terjual?: number | string;
  harga?: number | string;
  satuan?: string;
}

function StatusBadge({ status }: { status?: string }) {
  const s = status?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    selesai: "bg-emerald-50 text-emerald-600 border-emerald-100",
    delivered: "bg-emerald-50 text-emerald-600 border-emerald-100",
    dikirim: "bg-sky-50 text-sky-600 border-sky-100",
    shipped: "bg-sky-50 text-sky-600 border-sky-100",
    dibatalkan: "bg-red-50 text-red-500 border-red-100",
    cancelled: "bg-red-50 text-red-500 border-red-100",
    diproses: "bg-violet-50 text-violet-600 border-violet-100",
    processing: "bg-violet-50 text-violet-600 border-violet-100",
  };
  const cls = map[s] ?? "bg-amber-50 text-amber-600 border-amber-100";
  return (
    <span
      className={`text-[10px] px-1.5 py-[2px] rounded-md border font-medium capitalize ${cls}`}
    >
      {status}
    </span>
  );
}

const DashboardAdminPage: React.FC = () => {
  const router = useRouter();
  const { _hasHydrated, isAuthenticated } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [storesCount, setStoresCount] = useState(0);
  const [productsCount, setProductsCount] = useState(0);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [allOrders, setAllOrders] = useState<OrderData[]>([]);
  const [pesananHariIni, setPesananHariIni] = useState(0);
  const [totalPenjualan, setTotalPenjualan] = useState(0);
  const [topProduk, setTopProduk] = useState<ProductData[]>([]);
  const [affiliationsCount, setAffiliationsCount] = useState(0);
  const [isGudangOnline, setIsGudangOnline] = useState(true);
  const [adminStats, setAdminStats] = useState<any>(null);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    const fetchAll = async () => {
      try {
        const [storesRes, productsRes, ordersRes, warehousesRes, statsRes] =
          await Promise.all([
            storesApi.adminGetAll({ limit: 1 }),
            productsApi.getAll({ limit: 100, sortBy: "terjual_desc" }),
            ordersApi.adminGetAll({ limit: 200 }),
            gudangApi.getWarehouses().catch(() => null),
            dashboardApi.getStats().catch(() => null),
          ]);
        setIsGudangOnline(warehousesRes !== null);

        const storesData =
          storesRes?.data?.data?.data || storesRes?.data?.data || [];
        setStoresCount(storesRes?.data?.data?.total || storesData.length || 0);

        const productsData =
          productsRes?.data?.data?.data || productsRes?.data?.data || [];
        setProductsCount(
          productsRes?.data?.data?.total || productsData.length || 0,
        );
        const sortedProducts = [...productsData].sort(
          (a: ProductData, b: ProductData) =>
            Number(b.terjual || 0) - Number(a.terjual || 0),
        );
        setTopProduk(sortedProducts.slice(0, 5));

        const ordersData =
          ordersRes?.data?.data?.data || ordersRes?.data?.data || [];
        setAllOrders(ordersData);

        const sortedOrders = [...ordersData].sort(
          (a: OrderData, b: OrderData) =>
            new Date(b.tanggalDibuat || b.createdAt || "").getTime() -
            new Date(a.tanggalDibuat || a.createdAt || "").getTime(),
        );
        setOrders(sortedOrders.slice(0, 5));

        const today = new Date().toISOString().split("T")[0];
        const hariIniCount = ordersData.filter((o: OrderData) => {
          const d = new Date(o.tanggalDibuat || o.createdAt || "")
            .toISOString()
            .split("T")[0];
          return d === today;
        }).length;
        setPesananHariIni(hariIniCount);

        const total = ordersData
          .filter((o: OrderData) =>
            ["selesai", "SELESAI", "DELIVERED"].includes(o.status ?? ""),
          )
          .reduce(
            (sum: number, o: OrderData) =>
              sum + Number(o.totalHarga || o.totalAmount || 0),
            0,
          );
        setTotalPenjualan(total);

        if (warehousesRes) {
          const whData = warehousesRes?.data?.data || warehousesRes?.data || [];
          setAffiliationsCount(Array.isArray(whData) ? whData.length : 0);
        }

        if (statsRes?.data?.data?.overview) {
          setAdminStats(statsRes.data.data.overview);
        }
      } catch (err) {
        console.error("Failed to fetch admin dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [_hasHydrated, isAuthenticated, router]);

  if (!_hasHydrated || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-primary-500" size={28} />
          <p className="text-xs text-gray-400">Memuat data…</p>
        </div>
      </div>
    );
  }

  // ── Analytics derivations ─────────────────────────────────────────
  const chart7Day = compute7DayChart(allOrders);
  const trendPesanan = computeTrend(allOrders);

  const pendingCount = allOrders.filter((o) =>
    ["MENUNGGU_BAYAR", "DIPROSES"].includes(o.status ?? ""),
  ).length;
  const selesaiCount = allOrders.filter((o) =>
    ["SELESAI", "selesai", "DELIVERED"].includes(o.status ?? ""),
  ).length;
  const batalCount = allOrders.filter((o) =>
    ["DIBATALKAN", "dibatalkan"].includes(o.status ?? ""),
  ).length;
  const dikirimCount = allOrders.filter((o) =>
    ["DIKIRIM", "dikirim"].includes(o.status ?? ""),
  ).length;

  const avgOrderValue =
    allOrders.length > 0
      ? allOrders.reduce(
          (s, o) => s + Number(o.totalHarga || o.totalAmount || 0),
          0,
        ) / allOrders.length
      : 0;

  const conversionRate =
    allOrders.length > 0 ? (selesaiCount / allOrders.length) * 100 : 0;

  const now = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const stats = adminStats
    ? [
        {
          label: adminStats[2]?.label || "Total Toko",
          value: adminStats[2]?.value || storesCount,
          icon: Store,
          iconBg: "bg-primary-50",
          iconColor: "text-primary-600",
          trend: "Active",
          path: "/admin/toko",
          border: "border-gray-200",
        },
        {
          label: "Total Produk",
          value: productsCount,
          icon: Package,
          iconBg: "bg-primary-50",
          iconColor: "text-primary-600",
          trend: "Aktif",
          path: "/admin/produk",
          border: "border-gray-200",
        },
        {
          label: adminStats[3]?.label || "Total Pesanan",
          value: adminStats[3]?.value || 0,
          icon: ShoppingCart,
          iconBg: "bg-primary-50",
          iconColor: "text-primary-600",
          trend: "All Time",
          path: "/admin/pesanan",
          border: "border-gray-200",
        },
        {
          label: adminStats[4]?.label || "Pengajuan Stok Baru",
          value: adminStats[4]?.value || 0,
          icon: Warehouse,
          iconBg: "bg-primary-50",
          iconColor: "text-primary-600",
          trend: "Pending Gudang",
          path: "/admin/gudang",
          border: "border-gray-200",
        },
        {
          label: "Total GMV",
          value: formatRupiah(adminStats[5]?.value || totalPenjualan),
          icon: DollarSign,
          iconBg: "bg-primary-50",
          iconColor: "text-primary-600",
          trend: "Rupiah",
          path: "/admin/pesanan",
          border: "border-gray-200",
        },
      ]
    : [
        {
          label: "Total Toko",
          value: storesCount,
          icon: Store,
          iconBg: "bg-primary-50",
          iconColor: "text-primary-600",
          trend: "+2 bulan ini",
          path: "/admin/toko",
          border: "border-gray-200",
        },
        {
          label: "Total Produk",
          value: productsCount,
          icon: Package,
          iconBg: "bg-primary-50",
          iconColor: "text-primary-600",
          trend: "Aktif",
          path: "/admin/produk",
          border: "border-gray-200",
        },
        {
          label: "Pesanan Hari Ini",
          value: pesananHariIni,
          icon: ShoppingCart,
          iconBg: "bg-primary-50",
          iconColor: "text-primary-600",
          trend: "Masuk hari ini",
          path: "/admin/pesanan",
          border: "border-gray-200",
        },
        {
          label: "Gudang Tersedia",
          value: affiliationsCount,
          icon: Warehouse,
          iconBg: "bg-primary-50",
          iconColor: "text-primary-600",
          trend: "Gudang aktif",
          path: "/admin/gudang",
          border: "border-gray-200",
        },
        {
          label: "Total Penjualan",
          value: formatRupiah(totalPenjualan),
          icon: DollarSign,
          iconBg: "bg-primary-50",
          iconColor: "text-primary-600",
          trend: "Pesanan selesai",
          path: "/admin/pesanan",
          border: "border-gray-200",
        },
      ];

  const statusItems = [
    { label: "Pending", count: pendingCount, color: "bg-amber-400" },
    { label: "Dikirim", count: dikirimCount, color: "bg-sky-400" },
    { label: "Selesai", count: selesaiCount, color: "bg-emerald-400" },
    { label: "Batal", count: batalCount, color: "bg-rose-400" },
  ];

  return (
    <div className="space-y-5">
      {/* ── Page Header ─────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-gray-900 leading-tight">
            Dashboard Overview
          </h1>
          <p className="text-[13px] text-gray-400 mt-0.5">{now}</p>
        </div>
        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5">
          <Activity size={12} className="text-primary-500" />
          <span className="text-[11px] text-gray-500 font-medium">Live</span>
        </div>
      </div>

      {/* ── Stat Cards ─────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        {stats.map((s, i) => (
          <button
            key={i}
            onClick={() => router.push(s.path)}
            className={`bg-white border ${s.border} rounded-2xl p-4 text-left group hover:shadow-sm transition-all duration-200 active:scale-[0.98]`}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={`w-10 h-10 ${s.iconBg} rounded-xl flex items-center justify-center`}
              >
                <s.icon size={18} className={s.iconColor} />
              </div>
              <ArrowUpRight
                size={13}
                className="text-gray-200 group-hover:text-gray-400 transition-colors"
              />
            </div>
            <p className="text-[18px] font-bold text-gray-900 leading-none tracking-tight">
              {s.value}
            </p>
            <p className="text-[10.5px] text-gray-400 mt-1 uppercase tracking-wider">
              {s.label}
            </p>
            <p className="text-[10px] text-gray-300 mt-1">{s.trend}</p>
          </button>
        ))}
      </div>

      {/* ── Margin & Warehouse Status ───────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Margin Monitor Quick Link */}
        <div
          onClick={() => router.push("/admin/toko/margin")}
          className="cursor-pointer bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-2xl p-5 flex flex-col justify-center hover:from-emerald-500 hover:to-emerald-400 transition-all shadow-sm min-h-[110px]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-inner">
                <Percent size={20} />
              </div>
              <div>
                <p className="text-sm font-bold tracking-wide">
                  Monitor Margin & Profit B2B
                </p>
                <p className="text-xs text-emerald-100 mt-0.5 max-w-[200px]">
                  Pantau margin & estimasi profit seluruh toko aktif
                </p>
              </div>
            </div>
            <ChevronRight size={20} className="text-emerald-200" />
          </div>
        </div>

        {/* Gudang API Status Section */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm min-h-[110px] flex flex-col justify-center relative overflow-hidden group">
          <div
            className={`absolute inset-0 opacity-[0.03] pointer-events-none transition-opacity group-hover:opacity-[0.06] ${
              isGudangOnline ? "bg-emerald-500" : "bg-rose-500"
            }`}
          />

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${
                  isGudangOnline
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-rose-50 text-rose-600"
                }`}
              >
                {isGudangOnline ? (
                  <Warehouse size={20} />
                ) : (
                  <WifiOff size={20} />
                )}
              </div>
              <div>
                <p className="text-sm font-bold tracking-wide text-gray-900">
                  Koneksi API Gudang
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isGudangOnline
                        ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                        : "bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                    }`}
                  />
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider ${
                      isGudangOnline ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {isGudangOnline ? "Sistem Terhubung" : "Terputus / Offline"}
                  </span>
                </div>
              </div>
            </div>
            <Link
              href="/admin/gudang"
              className={`p-2 rounded-xl transition-colors ${
                isGudangOnline
                  ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-600"
                  : "bg-rose-50 hover:bg-rose-100 text-rose-600"
              }`}
            >
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Analytics Section ─────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-indigo-50 rounded-lg flex items-center justify-center">
            <BarChart2 size={12} className="text-indigo-500" />
          </div>
          <h2 className="text-[13px] font-semibold text-gray-700">
            Analitik Platform
          </h2>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {/* Total Pesanan + Trend chart */}
          <AnalyticsCard
            label="Total Pesanan (7 Hari)"
            value={chart7Day.reduce((a, b) => a + b, 0)}
            subtitle="Semua status pesanan masuk"
            trend={trendPesanan}
            trendLabel="vs. kemarin"
            chartData={chart7Day}
            chartColor="#6366f1"
            accentColor="border-l-indigo-400"
            icon={<ShoppingCart size={15} className="text-indigo-500" />}
            onClick={() => router.push("/admin/pesanan")}
          />

          {/* Pending pesanan */}
          <AnalyticsCard
            label="Pesanan Menunggu Proses"
            value={pendingCount}
            subtitle="Butuh tindakan segera"
            trend={pendingCount > 0 ? undefined : 0}
            chartData={Array(7)
              .fill(0)
              .map(
                (_, i) =>
                  allOrders.filter(
                    (o) =>
                      ["MENUNGGU_BAYAR", "DIPROSES"].includes(o.status ?? "") &&
                      Math.floor(
                        (Date.now() -
                          new Date(
                            o.tanggalDibuat || o.createdAt || "",
                          ).getTime()) /
                          86400000,
                      ) ===
                        6 - i,
                  ).length,
              )}
            chartColor="#f59e0b"
            accentColor="border-l-amber-400"
            icon={<Clock size={15} className="text-amber-500" />}
            onClick={() => router.push("/admin/pesanan")}
          />

          {/* Avg Order Value */}
          <AnalyticsCard
            label="Rata-Rata Nilai Pesanan"
            value={formatRupiah(avgOrderValue)}
            subtitle={`Dari ${allOrders.length} total pesanan`}
            chartData={chart7Day.map(
              (c) => c * Math.round(avgOrderValue / 1000),
            )}
            chartColor="#10b981"
            accentColor="border-l-emerald-400"
            icon={<TrendingUp size={15} className="text-emerald-500" />}
            onClick={() => router.push("/admin/pesanan")}
          />

          {/* Conversion Rate */}
          <AnalyticsCard
            label="Tingkat Konversi"
            value={`${conversionRate.toFixed(1)}%`}
            subtitle={`${selesaiCount} selesai dari ${allOrders.length} total`}
            trend={conversionRate - 50}
            trendLabel="vs target 50%"
            chartData={[
              selesaiCount,
              batalCount,
              pendingCount,
              dikirimCount,
            ].map((v) => v || 0)}
            chartColor="#8b5cf6"
            accentColor="border-l-violet-400"
            icon={<CheckCircle2 size={15} className="text-violet-500" />}
            onClick={() => router.push("/admin/laporan")}
          />
        </div>
      </div>

      {/* ── Status Distribution ────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center">
              <BarChart2 size={13} className="text-slate-400" />
            </div>
            <h2 className="text-[13px] font-semibold text-gray-800">
              Distribusi Status Pesanan
            </h2>
          </div>
          <span className="text-[10px] text-gray-400 font-medium">
            {allOrders.length} total
          </span>
        </div>
        <StatusDistributionBar items={statusItems} />

        {/* Quick count row */}
        <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-gray-50">
          {[
            {
              label: "Selesai",
              count: selesaiCount,
              icon: CheckCircle2,
              color: "text-emerald-500",
            },
            {
              label: "Dikirim",
              count: dikirimCount,
              icon: TrendingUp,
              color: "text-sky-500",
            },
            {
              label: "Pending",
              count: pendingCount,
              icon: Clock,
              color: "text-amber-500",
            },
            {
              label: "Batal",
              count: batalCount,
              icon: XCircle,
              color: "text-rose-500",
            },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <item.icon size={14} className={`${item.color} mx-auto mb-1`} />
              <p className="text-[16px] font-bold text-gray-800">
                {item.count}
              </p>
              <p className="text-[9px] text-gray-400 uppercase tracking-wider">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Two columns ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pesanan Terbaru */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center">
                <ClipboardList size={13} className="text-amber-500" />
              </div>
              <h2 className="text-[13px] font-semibold text-gray-800">
                Pesanan Terbaru
              </h2>
            </div>
            <button
              onClick={() => router.push("/admin/pesanan")}
              className="flex items-center gap-1 text-[11px] text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              Lihat Semua <ArrowRight size={11} />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {orders.length === 0 && (
              <div className="text-center py-8 text-gray-300 text-xs">
                Belum ada pesanan masuk.
              </div>
            )}
            {orders.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between py-2.5 hover:bg-gray-50 -mx-1 px-1 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Users size={12} className="text-gray-300" />
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-gray-800 leading-tight truncate max-w-[120px]">
                      {p.customer?.name || p.pembeli || "Customer"}
                    </p>
                    <p className="text-[10.5px] text-gray-400 mt-0.5">
                      {formatTanggal(p.tanggalDibuat || p.createdAt || "")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[12px] font-semibold text-gray-800">
                    {formatRupiah(p.totalHarga || p.totalAmount || 0)}
                  </p>
                  <div className="mt-0.5 flex justify-end">
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Produk */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-primary-50 rounded-lg flex items-center justify-center">
                <TrendingUp size={13} className="text-primary-600" />
              </div>
              <h2 className="text-[13px] font-semibold text-gray-800">
                Produk Terlaris
              </h2>
            </div>
            <button
              onClick={() => router.push("/admin/produk")}
              className="flex items-center gap-1 text-[11px] text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              Lihat Semua <ArrowRight size={11} />
            </button>
          </div>
          <div className="space-y-1">
            {topProduk.length === 0 && (
              <div className="text-center py-8 text-gray-300 text-xs">
                Belum ada data produk.
              </div>
            )}
            {topProduk.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center gap-3 py-2 hover:bg-gray-50 -mx-1 px-1 rounded-xl transition-colors"
              >
                <span
                  className={`text-[11px] font-bold w-5 text-center flex-shrink-0 ${i === 0 ? "text-amber-400" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-700" : "text-gray-200"}`}
                >
                  {i + 1}
                </span>
                <div className="w-8 h-8 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 relative">
                  {p.gambarUrl || p.gambar ? (
                    <Image
                      src={(p.gambarUrl || p.gambar) as string}
                      alt={p.nama ?? ""}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm">
                      {p.emoji || "📦"}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-gray-800 truncate leading-tight">
                    {p.nama}
                  </p>
                  <p className="text-[10.5px] text-gray-400 truncate mt-0.5">
                    {p.store?.nama || p.tokoNama || "—"}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[11.5px] font-semibold text-gray-700">
                    {p.terjual || 0}
                    <span className="font-normal text-gray-400"> terjual</span>
                  </p>
                  <p className="text-[10.5px] text-gray-400 mt-0.5">
                    {formatRupiah(p.harga || 0)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick Actions ────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <h2 className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Aksi Cepat
        </h2>
        <div className="flex flex-wrap gap-2">
          {[
            {
              label: "Tambah Toko",
              icon: Store,
              path: "/admin/toko",
              color: "text-blue-600 bg-blue-50 border-blue-100",
            },
            {
              label: "Tambah Produk",
              icon: Package,
              path: "/admin/produk",
              color: "text-primary-600 bg-primary-50 border-primary-100",
            },
            {
              label: "Lihat Pesanan",
              icon: ClipboardList,
              path: "/admin/pesanan",
              color: "text-amber-600 bg-amber-50 border-amber-100",
            },
            {
              label: "Approval Toko",
              icon: CalendarCheck,
              path: "/admin/approval-toko",
              color: "text-violet-600 bg-violet-50 border-violet-100",
            },
            {
              label: "Kemitraan Gudang",
              icon: Warehouse,
              path: "/admin/gudang",
              color: "text-emerald-600 bg-emerald-50 border-emerald-100",
            },
            {
              label: "Monitor Margin",
              icon: Percent,
              path: "/admin/toko/margin",
              color: "text-indigo-600 bg-indigo-50 border-indigo-100",
            },
          ].map((a) => (
            <button
              key={a.path}
              onClick={() => router.push(a.path)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[11.5px] font-medium transition-all hover:shadow-sm active:scale-95 ${a.color}`}
            >
              <a.icon size={13} />
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardAdminPage;
