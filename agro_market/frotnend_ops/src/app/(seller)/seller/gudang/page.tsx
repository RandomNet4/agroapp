"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Warehouse,
  Loader2,
  AlertCircle,
  RefreshCw,
  Phone,
  MapPin,
  Building2,
  Info,
  Star,
  ChevronRight,
  Package,
} from "lucide-react";

import { gudangApi, storesApi } from "@/lib/ecommerce-api";

const FAVORITE_KEY = "seller_gudang_favorit";

interface GudangData {
  id: string;
  nama: string;
  alamat: string;
  telepon: string;
  kapasitas: number;
}

interface AffiliationData {
  id: string;
  tokoId: string;
  gudangId: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
  gudang: GudangData | null;
}

interface WarehouseWithInfo extends AffiliationData {
  gudangInfo: {
    nama: string;
    alamat: string;
    telepon: string;
    isOffline: boolean;
  };
}

const FALLBACK_WAREHOUSES: Record<
  string,
  { nama: string; alamat: string; telepon: string }
> = {
  "8ecaddc3-85d3-4715-9490-35158899f441": {
    nama: "Gudang Utama Agro Jabar",
    alamat: "Jl. Soekarno Hatta No.10, Bandung",
    telepon: "081122334455",
  },
};

export default function SellerGudangPage() {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<WarehouseWithInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [favoriteId, setFavoriteId] = useState<string | null>(null);

  // Load favorit dari localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FAVORITE_KEY);
      if (saved) setFavoriteId(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleFavorite = (e: React.MouseEvent, gudangId: string) => {
    e.stopPropagation();
    try {
      const next = favoriteId === gudangId ? null : gudangId;
      setFavoriteId(next);
      if (next) {
        localStorage.setItem(FAVORITE_KEY, next);
      } else {
        localStorage.removeItem(FAVORITE_KEY);
      }
    } catch {
      /* ignore */
    }
  };

  const getGudangInfo = (item: AffiliationData) => {
    if (item.gudang) {
      return {
        nama: item.gudang.nama,
        alamat: item.gudang.alamat,
        telepon: item.gudang.telepon,
        isOffline: false,
      };
    }
    const fallback = FALLBACK_WAREHOUSES[item.gudangId] || {
      nama: "Gudang Regional Agro Jabar",
      alamat: "Alamat tidak tersedia",
      telepon: "-",
    };
    return { ...fallback, isOffline: true };
  };

  const fetchWarehouses = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError("");

      const storeRes = await storesApi.getMyStore();
      const storeData = storeRes?.data?.data || storeRes?.data;
      if (!storeData?.id) {
        setError("Profil toko Anda tidak dapat ditemukan.");
        setLoading(false);
        return;
      }

      let warehouseData: any[] = [];
      try {
        const whRes = await gudangApi.getAllWarehousesForMarketplace();
        const rawData = whRes?.data?.data || whRes?.data || [];
        warehouseData = Array.isArray(rawData) ? rawData : [];
      } catch {
        warehouseData = Object.entries(FALLBACK_WAREHOUSES).map(
          ([id, info]) => ({
            id,
            ...info,
          }),
        );
      }

      const affData: WarehouseWithInfo[] = warehouseData.map((wh: any) => {
        const item: AffiliationData = {
          id: `marketplace-${wh.id}`,
          tokoId: storeData.id,
          gudangId: wh.id,
          status: "ACTIVE",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          gudang: {
            id: wh.id,
            nama: wh.nama,
            alamat: wh.alamat,
            telepon: wh.telepon || "-",
            kapasitas: wh.kapasitas || 500,
          },
        };
        return { ...item, gudangInfo: getGudangInfo(item) };
      });

      setWarehouses(affData);
    } catch (err: any) {
      setError(err.message || "Gagal memuat data gudang.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-32 space-y-4">
        <Loader2 className="w-8 h-8 text-emerald-600/80 animate-spin" />
        <p className="text-sm font-medium text-slate-400">
          Memuat daftar gudang...
        </p>
      </div>
    );
  }

  // Sort: favorit di atas
  const sorted = [...warehouses].sort((a, b) => {
    if (a.gudangId === favoriteId) return -1;
    if (b.gudangId === favoriteId) return 1;
    return 0;
  });

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b border-slate-100/80">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
              <Warehouse className="w-5 h-5" />
            </div>
            <h1 className="text-2xl md:text-3xl font-medium tracking-tight text-slate-800">
              Daftar Gudang
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-400 font-medium">
            Klik gudang untuk melihat detail dan riwayat pengajuan. Tandai
            bintang untuk jadikan favorit.
          </p>
        </div>
        <button
          onClick={() => fetchWarehouses()}
          className="self-start sm:self-center px-4 py-2 border border-slate-100 rounded-xl text-xs font-medium hover:bg-slate-50 active:scale-[0.98] transition-all text-slate-500 flex items-center gap-2 bg-white shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Perbarui
        </button>
      </div>

      {error && (
        <div className="bg-rose-50/50 border border-rose-100 text-rose-700 p-5 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
          <p className="text-xs">{error}</p>
        </div>
      )}

      {/* Favorit info */}
      {favoriteId && (
        <div className="bg-amber-50/60 border border-amber-100 rounded-2xl px-4 py-3 flex items-center gap-2.5">
          <Star className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />
          <p className="text-xs text-amber-700 font-medium">
            Gudang favorit aktif — halaman Daftar Produk Gudang akan otomatis
            menampilkan produk dari gudang ini.
          </p>
          <button
            onClick={() => {
              setFavoriteId(null);
              localStorage.removeItem(FAVORITE_KEY);
            }}
            className="ml-auto text-[10px] text-amber-500 hover:text-amber-700 font-medium shrink-0 underline"
          >
            Hapus favorit
          </button>
        </div>
      )}

      {/* List */}
      {sorted.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100/80 shadow-sm space-y-4">
          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
            <Warehouse className="w-6 h-6" />
          </div>
          <h3 className="font-medium text-base text-slate-700">
            Belum Ada Gudang Tersedia
          </h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            Hubungi Admin untuk informasi lebih lanjut.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sorted.map((item) => {
            const isFav = item.gudangId === favoriteId;
            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/seller/gudang/${item.gudangId}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    router.push(`/seller/gudang/${item.gudangId}`);
                }}
                className={`bg-white border text-left rounded-3xl p-5 transition-all duration-200 hover:shadow-md group flex flex-col gap-4 relative cursor-pointer ${
                  isFav
                    ? "border-amber-300 shadow-sm shadow-amber-50"
                    : "border-slate-100 hover:border-emerald-200/70"
                }`}
              >
                {/* Favorite badge */}
                {isFav && (
                  <span className="absolute top-4 right-14 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    Favorit
                  </span>
                )}

                {/* Star button */}
                <button
                  onClick={(e) => toggleFavorite(e, item.gudangId)}
                  className={`absolute top-4 right-4 p-1.5 rounded-xl transition-all ${
                    isFav
                      ? "text-amber-400 hover:text-amber-500"
                      : "text-slate-200 hover:text-amber-400"
                  }`}
                  title={isFav ? "Hapus dari favorit" : "Jadikan favorit"}
                >
                  <Star
                    className={`w-4 h-4 ${isFav ? "fill-amber-400" : ""}`}
                  />
                </button>

                {/* Header */}
                <div className="flex items-center gap-3 pr-10">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      isFav
                        ? "bg-amber-50 text-amber-500"
                        : "bg-emerald-50 text-emerald-500"
                    }`}
                  >
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3
                      className={`font-semibold text-sm truncate transition-colors ${
                        isFav
                          ? "text-amber-700"
                          : "text-slate-800 group-hover:text-emerald-600"
                      }`}
                    >
                      {item.gudangInfo.nama}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{item.gudangInfo.alamat}</span>
                    </p>
                  </div>
                </div>

                {/* Info row */}
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 shrink-0" />
                    {item.gudangInfo.telepon}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Package className="w-3 h-3 shrink-0" />
                    {item.gudang?.kapasitas || 500} Ton
                  </span>
                </div>

                {/* Footer CTA */}
                <div className="border-t border-slate-50 pt-3 flex items-center justify-between">
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(
                        `/seller/gudang/produk?gudangId=${item.gudangId}`,
                      );
                    }}
                    className="text-xs text-emerald-600 font-medium hover:underline"
                  >
                    Lihat produk →
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 group-hover:text-emerald-600 transition-colors font-medium">
                    Detail & Riwayat
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info */}
      <div className="bg-slate-50/50 border border-slate-100 rounded-3xl p-5 flex items-start gap-4">
        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
          <Info className="w-4 h-4" />
        </div>
        <p className="text-xs text-slate-400 leading-relaxed font-medium">
          Tandai bintang ⭐ pada gudang untuk menjadikannya{" "}
          <span className="text-slate-600">favorit</span>. Halaman{" "}
          <span className="text-emerald-600">Daftar Produk Gudang</span> akan
          otomatis memfilter produk dari gudang favorit saat pertama kali
          dibuka. Kamu tetap bisa mengganti filter kapan saja.
        </p>
      </div>
    </div>
  );
}
