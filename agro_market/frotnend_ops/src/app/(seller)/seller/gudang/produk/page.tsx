"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Package,
  Loader2,
  AlertCircle,
  Plus,
  Search,
  ChevronRight,
  CheckCircle2,
  Star,
  ShoppingCart,
} from "lucide-react";

import { gudangApi, storesApi } from "@/lib/ecommerce-api";

const FAVORITE_KEY = "seller_gudang_favorit";
const CART_KEY = "pengajuan_cart";

interface CartStorage {
  gudangId: string;
  items: {
    produkGudangId: string;
    jumlahPermintaan: number;
    ukuranKemasanKg: number;
    jumlahKemasan: number;
  }[];
}

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

interface Product {
  id: string;
  nama: string;
  varianProduk?: string | null;
  deskripsi?: string;
  satuan: string;
  hargaGudang: number;
  minimalPembelianKg?: number;
  gambarUrl?: string;
  createdAt: string;
}

interface ProductWithGudang extends Product {
  gudangId: string;
  gudangNama: string;
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

export default function SellerWarehouseProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // gudangId dari query param (misal klik "Lihat Produk" dari daftar gudang)
  const qGudangId = searchParams.get("gudangId") || null;

  const [affiliations, setAffiliations] = useState<AffiliationData[]>([]);
  const [allProducts, setAllProducts] = useState<ProductWithGudang[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductWithGudang[]>(
    [],
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGudangFilter, setSelectedGudangFilter] =
    useState<string>("all");
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cart, setCart] = useState<ProductWithGudang[]>([]);

  // Restore cart dari localStorage setelah produk dimuat
  // (dihandle di fetchAllProducts)

  // Baca favorit dari localStorage saat pertama load
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FAVORITE_KEY);
      if (saved) setFavoriteId(saved);
    } catch {
      /* ignore */
    }
  }, []);

  // Tentukan filter default setelah affiliations & favorit diketahui
  // Prioritas: query param > favorit > 'all'
  useEffect(() => {
    if (affiliations.length === 0) return;
    if (qGudangId && affiliations.some((a) => a.gudangId === qGudangId)) {
      setSelectedGudangFilter(qGudangId);
    } else if (
      favoriteId &&
      affiliations.some((a) => a.gudangId === favoriteId)
    ) {
      setSelectedGudangFilter(favoriteId);
    }
    // else tetap 'all'
  }, [affiliations, favoriteId, qGudangId]);

  const toggleCart = (product: ProductWithGudang) => {
    setError("");
    setCart((prev) => {
      let next: ProductWithGudang[];
      const exists = prev.some(
        (p) => p.id === product.id && p.gudangId === product.gudangId,
      );
      if (exists) {
        next = prev.filter(
          (p) => !(p.id === product.id && p.gudangId === product.gudangId),
        );
      } else {
        if (prev.length > 0 && prev[0].gudangId !== product.gudangId) {
          setError(
            "Satu pengajuan hanya boleh dari satu gudang. Kosongkan daftar terlebih dahulu.",
          );
          setTimeout(() => setError(""), 3500);
          return prev;
        }
        next = [...prev, product];
      }
      // Sync ke localStorage
      try {
        if (next.length === 0) {
          localStorage.removeItem(CART_KEY);
        } else {
          localStorage.setItem(
            CART_KEY,
            JSON.stringify({
              gudangId: next[0].gudangId,
              items: next.map((p) => {
                const minKg = p.minimalPembelianKg ?? 300;
                return {
                  produkGudangId: p.id,
                  jumlahPermintaan: minKg,
                  ukuranKemasanKg: 1.0,
                  jumlahKemasan: minKg,
                };
              }),
            }),
          );
        }
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const isInCart = (product: ProductWithGudang) =>
    cart.some((p) => p.id === product.id && p.gudangId === product.gudangId);

  const handleLanjutPengajuan = () => {
    if (cart.length === 0) return;
    const gId = cart[0].gudangId;
    // Simpan draft ke sessionStorage juga agar baru/page bisa merge
    sessionStorage.setItem(
      "pengajuan_draft",
      JSON.stringify({ gudangId: gId, produkIds: cart.map((p) => p.id) }),
    );
    router.push(`/seller/pengajuan-stok/baru?gudangId=${gId}`);
  };

  const getGudangDetails = (item: AffiliationData) => {
    if (item.gudang) return { nama: item.gudang.nama, isOffline: false };
    const fallback = FALLBACK_WAREHOUSES[item.gudangId];
    return {
      nama: fallback?.nama || "Gudang Regional Agro Jabar",
      isOffline: true,
    };
  };

  const fetchAffiliations = useCallback(async (showLoading = true) => {
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
          ([id, info]) => ({ id, ...info }),
        );
      }

      const affData: AffiliationData[] = warehouseData.map((wh: any) => ({
        id: `marketplace-${wh.id}`,
        tokoId: storeData.id,
        gudangId: wh.id,
        status: "ACTIVE" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        gudang: {
          id: wh.id,
          nama: wh.nama,
          alamat: wh.alamat,
          telepon: wh.telepon || "-",
          kapasitas: wh.kapasitas || 0,
        },
      }));

      setAffiliations(affData);
      await fetchAllProducts(affData);
    } catch (err: any) {
      setError(err.message || "Gagal memuat data gudang.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllProducts = async (affData: AffiliationData[]) => {
    if (affData.length === 0) {
      setAllProducts([]);
      return;
    }
    const promises = affData.map(async (aff) => {
      try {
        const res = await gudangApi.getProductsForRequest(aff.gudangId);
        const responseData =
          res?.data?.data?.data || res?.data?.data || res?.data || {};
        const prods = responseData.products || [];
        const { nama: gudangNama } = getGudangDetails(aff);
        return prods.map((p: Product) => ({
          ...p,
          gudangId: aff.gudangId,
          gudangNama,
        }));
      } catch {
        return [];
      }
    });
    const arrays = await Promise.all(promises);
    const allProds: ProductWithGudang[] = arrays.flat();
    setAllProducts(allProds);

    // Restore cart dari localStorage
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as CartStorage;
        if (saved?.gudangId && saved?.items?.length > 0) {
          const restored = saved.items
            .map((it) =>
              allProds.find(
                (p) =>
                  p.id === it.produkGudangId && p.gudangId === saved.gudangId,
              ),
            )
            .filter((p): p is ProductWithGudang => !!p);
          if (restored.length > 0) {
            setCart(restored);
          }
        }
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    fetchAffiliations();
  }, [fetchAffiliations]);

  // Apply filter
  useEffect(() => {
    let filtered = allProducts;
    if (selectedGudangFilter !== "all") {
      filtered = filtered.filter((p) => p.gudangId === selectedGudangFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.nama.toLowerCase().includes(q) ||
          p.varianProduk?.toLowerCase().includes(q) ||
          p.gudangNama.toLowerCase().includes(q),
      );
    }
    setFilteredProducts(filtered);
  }, [searchQuery, allProducts, selectedGudangFilter]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-32 space-y-4">
        <Loader2 className="w-8 h-8 text-emerald-600/80 animate-spin" />
        <p className="text-sm font-medium text-slate-400">
          Memuat daftar produk...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      {/* ── Hero Header ─────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-emerald-700 to-emerald-800 rounded-3xl p-6 md:p-8 text-white shadow-lg shadow-emerald-900/20">
        {/* Title row */}
        <div className="flex items-center gap-4 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/25 flex items-center justify-center shrink-0 shadow-inner">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight leading-tight">
              Daftar Produk Gudang
            </h1>
            <p className="text-emerald-200/70 text-xs mt-0.5 font-normal">
              Pilih produk &amp; tambahkan ke daftar ajukan
            </p>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Cari produk, komoditas, atau gudang..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/15 rounded-2xl text-white placeholder-emerald-200/40 focus:outline-none focus:bg-white/15 focus:border-white/30 text-sm transition-all"
          />
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-emerald-200/50" />
        </div>

        {/* Filter chips gudang */}
        {affiliations.length > 1 && (
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => setSelectedGudangFilter("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                selectedGudangFilter === "all"
                  ? "bg-white text-emerald-700 border-white shadow-sm"
                  : "bg-white/15 text-white border-white/20 hover:bg-white/25"
              }`}
            >
              Semua
            </button>
            {affiliations.map((aff) => {
              const { nama } = getGudangDetails(aff);
              const isFav = aff.gudangId === favoriteId;
              const isActive = selectedGudangFilter === aff.gudangId;
              return (
                <button
                  key={aff.gudangId}
                  onClick={() => setSelectedGudangFilter(aff.gudangId)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all border flex items-center gap-1.5 ${
                    isActive
                      ? "bg-white text-emerald-700 border-white shadow-sm"
                      : "bg-white/15 text-white border-white/20 hover:bg-white/25"
                  }`}
                >
                  {isFav && (
                    <Star
                      className={`w-3 h-3 shrink-0 ${isActive ? "fill-amber-400 text-amber-400" : "fill-amber-200 text-amber-200"}`}
                    />
                  )}
                  {nama}
                </button>
              );
            })}
            {favoriteId && selectedGudangFilter === favoriteId && (
              <span className="text-[10px] text-emerald-200/50 ml-1">
                ⭐ favorit
              </span>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rose-50/50 border border-rose-100 text-rose-700 p-4 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
          <p className="text-xs leading-relaxed">{error}</p>
        </div>
      )}

      {/* Grid Produk */}
      {allProducts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100/80 shadow-sm space-y-4">
          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="font-medium text-base text-slate-700">
            Belum Ada Produk
          </h3>
          <p className="text-xs text-slate-400">
            Belum ada produk tersedia dari gudang.
          </p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-amber-50/40 border border-amber-100/70 p-5 rounded-2xl flex items-start gap-3.5">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
          <div>
            <h3 className="font-medium text-sm text-amber-900">
              Tidak Ada Produk
            </h3>
            <p className="text-xs mt-1 text-amber-700/90">
              {searchQuery
                ? "Tidak ada produk yang sesuai pencarian."
                : "Tidak ada produk untuk filter yang dipilih."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
          {filteredProducts.map((product) => (
            <div
              key={`${product.id}-${product.gudangId}`}
              className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
            >
              {/* Foto */}
              <div className="w-full aspect-[4/3] bg-slate-100 overflow-hidden">
                {product.gambarUrl ? (
                  <img
                    src={product.gambarUrl}
                    alt={product.nama}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Package className="w-10 h-10" />
                  </div>
                )}
              </div>

              {/* Konten */}
              <div className="p-4 flex flex-col flex-1 gap-2">
                <h3 className="font-semibold text-sm text-slate-800 line-clamp-1">
                  {product.varianProduk
                    ? `${product.nama} ${product.varianProduk}`
                    : product.nama}
                </h3>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-wider">
                    {product.nama}
                  </span>
                  {product.varianProduk && (
                    <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 uppercase tracking-wider">
                      {product.varianProduk}
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-bold text-base text-emerald-600">
                    Rp {product.hargaGudang.toLocaleString("id-ID")}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    / {product.satuan}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Min. pembelian{" "}
                  <span className="font-semibold text-slate-700">
                    {(product.minimalPembelianKg ?? 300).toLocaleString(
                      "id-ID",
                    )}{" "}
                    {product.satuan}
                  </span>
                </p>
                <button
                  onClick={() => toggleCart(product)}
                  className={`mt-auto w-full px-3 py-2 rounded-xl text-xs font-medium transition-all border flex items-center justify-center gap-1.5 active:scale-[0.98] ${
                    isInCart(product)
                      ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                      : "bg-emerald-50/60 hover:bg-emerald-100/60 text-emerald-600 border-emerald-100/50"
                  }`}
                >
                  {isInCart(product) ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Ditambahkan
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Tambah ke Daftar
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bar Keranjang sticky */}
      {cart.length > 0 && (
        <div className="sticky bottom-4 z-30 mt-2">
          <div className="bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-900/20 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0 border border-white/20 relative">
                <Package className="w-5 h-5" />
                <span className="absolute -top-1.5 -right-1.5 bg-white text-emerald-700 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
                  {cart.length}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">
                  {cart.length} produk siap diajukan
                </p>
                <p className="text-[11px] text-emerald-50/80 truncate">
                  Dari {cart[0].gudangNama}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setCart([]);
                  try {
                    localStorage.removeItem(CART_KEY);
                  } catch {
                    /* ignore */
                  }
                }}
                className="px-3 py-2 text-xs font-medium text-emerald-50/90 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              >
                Kosongkan
              </button>
              <button
                onClick={handleLanjutPengajuan}
                className="px-5 py-2.5 bg-white text-emerald-700 hover:bg-emerald-50 rounded-xl text-xs font-bold transition-all active:scale-[0.98] flex items-center gap-1.5"
              >
                Lanjut Ajukan
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
