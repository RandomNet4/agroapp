"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  Download,
  Calendar,
  Loader2,
  Store,
  FileSpreadsheet,
  MapPin,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { storesApi } from "@/lib/api/stores";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";

interface StoreData {
  id: string;
  nama: string;
  slug: string;
  deskripsi?: string;
  logoUrl?: string;
  alamat?: string;
  wilayah?: string;
  status?: string;
  createdAt: string;
}

export default function AdminLaporanPenjualanPage() {
  const router = useRouter();
  const { _hasHydrated, isAuthenticated, user } = useAuthStore();
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);

  // Global filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingStoreId, setDownloadingStoreId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!_hasHydrated) return;

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    // Double check if user is admin
    if (user?.role !== "SUPER_ADMIN" && user?.role !== "ADMIN_CS") {
      toast.error("Akses ditolak. Halaman ini khusus Administrator.");
      router.push("/");
      return;
    }

    const fetchStores = async () => {
      try {
        const response = await storesApi.adminGetAll();
        const raw = response?.data?.data || response?.data || [];
        const arr = Array.isArray(raw) ? raw : (raw.data ?? []);
        setStores(arr);
      } catch (error) {
        console.error("Gagal mengambil data toko:", error);
        toast.error("Gagal memuat daftar toko / seller");
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, [_hasHydrated, isAuthenticated, user, router]);

  // Download all store transaction data in 1 file
  const handleDownloadAllData = async () => {
    setDownloadingAll(true);
    const toastId = toast.loading("Menyiapkan Laporan Global Semua Seller...");

    try {
      const response = await apiClient.get(
        "/ecom-pesanan/admin/laporan/excel",
        {
          params: {
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          },
          responseType: "blob",
        },
      );

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const dateStr = `${startDate || "semua"}_ke_${endDate || "semua"}`;
      link.setAttribute(
        "download",
        `Laporan_Penjualan_Global_Admin_${dateStr}.xlsx`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Laporan Penjualan Global berhasil diunduh!", {
        id: toastId,
      });
    } catch (error) {
      console.error("Gagal mengunduh laporan global:", error);
      toast.error("Gagal mengunduh laporan global. Coba lagi.", {
        id: toastId,
      });
    } finally {
      setDownloadingAll(false);
    }
  };

  // Download specific store transaction data
  const handleDownloadStoreReport = async (
    tokoId: string,
    storeName: string,
  ) => {
    setDownloadingStoreId(tokoId);
    const toastId = toast.loading(`Menyiapkan Laporan Toko ${storeName}...`);

    try {
      const response = await apiClient.get(
        `/ecom-pesanan/penjual/${tokoId}/laporan/excel`,
        {
          params: {
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          },
          responseType: "blob",
        },
      );

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const dateStr = `${startDate || "semua"}_ke_${endDate || "semua"}`;
      link.setAttribute(
        "download",
        `Laporan_Transaksi_Seller_${storeName.replace(/\s+/g, "_")}_${dateStr}.xlsx`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Laporan Toko ${storeName} berhasil diunduh!`, {
        id: toastId,
      });
    } catch (error) {
      console.error(`Gagal mengunduh laporan toko ${storeName}:`, error);
      toast.error(`Gagal mengunduh laporan toko ${storeName}. Coba lagi.`, {
        id: toastId,
      });
    } finally {
      setDownloadingStoreId(null);
    }
  };

  // Helper to set preset dates for filters
  const applyPreset = (days: number) => {
    if (days === 0) {
      setStartDate("");
      setEndDate("");
      return;
    }
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);

    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };

  if (!_hasHydrated || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="text-emerald-600" size={28} /> Laporan Penjualan
          (Admin)
        </h1>
        <p className="text-gray-500 mt-1">
          Pantau seluruh transaksi toko seller di platform dan unduh laporan
          spreadsheet terpadu.
        </p>
      </div>

      {/* Global Filter Bar & Master Download */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          {/* Inputs Section */}
          <div className="space-y-4 flex-1">
            <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-1.5">
              <Calendar size={16} className="text-emerald-600" /> Filter Rentang
              Tanggal Laporan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Tanggal Mulai
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Tanggal Akhir
                </span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                />
              </div>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => applyPreset(7)}
                className="px-3.5 py-1.5 bg-gray-50 hover:bg-emerald-50 hover:text-emerald-700 text-gray-600 text-xs font-semibold rounded-xl border border-gray-100 transition-all"
              >
                7 Hari Terakhir
              </button>
              <button
                onClick={() => applyPreset(30)}
                className="px-3.5 py-1.5 bg-gray-50 hover:bg-emerald-50 hover:text-emerald-700 text-gray-600 text-xs font-semibold rounded-xl border border-gray-100 transition-all"
              >
                30 Hari Terakhir
              </button>
              <button
                onClick={() => applyPreset(0)}
                className="px-3.5 py-1.5 bg-gray-50 hover:bg-emerald-50 hover:text-emerald-700 text-gray-600 text-xs font-semibold rounded-xl border border-gray-100 transition-all"
              >
                Semua Waktu
              </button>
            </div>
          </div>

          {/* Master Action Button */}
          <div className="xl:pt-6">
            <button
              onClick={handleDownloadAllData}
              disabled={downloadingAll}
              className="w-full xl:w-auto bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold py-4 px-8 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed group active:scale-[0.98]"
            >
              {downloadingAll ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Mengekspor Laporan Global...</span>
                </>
              ) : (
                <>
                  <Download
                    size={20}
                    className="group-hover:translate-y-0.5 transition-transform"
                  />
                  <span>Download Laporan Semua Data (.xlsx)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Seller Grid Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Daftar Toko / Seller Aktif
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Unduh data laporan pesanan spesifik untuk masing-masing seller
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {stores.map((store) => (
            <div
              key={store.id}
              className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
            >
              {/* Store Identity */}
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  {store.logoUrl ? (
                    <img
                      src={store.logoUrl}
                      alt={store.nama}
                      className="w-12 h-12 rounded-2xl border border-gray-100 object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100/50 flex-shrink-0">
                      <Store size={22} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-gray-900 truncate leading-snug">
                      {store.nama}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-mono tracking-wide mt-0.5 truncate">
                      {store.slug}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-gray-500 line-clamp-2 min-h-[2rem]">
                  {store.deskripsi || "Belum ada deskripsi profil toko."}
                </p>

                <div className="flex flex-wrap gap-2 text-[10px] pt-1">
                  {store.wilayah && (
                    <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-500 px-2 py-0.5 rounded-md font-semibold">
                      <MapPin size={10} /> {store.wilayah}
                    </span>
                  )}
                  {store.status === "ACTIVE" ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-semibold">
                      <CheckCircle2 size={10} /> Aktif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-semibold">
                      <AlertCircle size={10} /> {store.status || "Draft"}
                    </span>
                  )}
                </div>
              </div>

              {/* Single Export Action */}
              <button
                onClick={() => handleDownloadStoreReport(store.id, store.nama)}
                disabled={downloadingStoreId !== null}
                className="w-full mt-6 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white font-bold py-2.5 px-4 rounded-xl shadow-sm hover:shadow transition-all duration-300 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed group text-xs"
              >
                {downloadingStoreId === store.id ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    <span>Mengekspor...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet
                      size={14}
                      className="group-hover:translate-y-0.5 transition-transform"
                    />
                    <span>Unduh Laporan Toko Ini</span>
                  </>
                )}
              </button>
            </div>
          ))}

          {stores.length === 0 && (
            <div className="col-span-full bg-gray-50 rounded-3xl p-12 text-center text-gray-400">
              <Store size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="font-semibold text-gray-800 text-sm">
                Tidak ada seller terdaftar
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Daftar toko seller yang terdaftar akan ditampilkan di sini
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
