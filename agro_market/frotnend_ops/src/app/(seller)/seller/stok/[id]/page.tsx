"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Package,
  ArrowLeft,
  RefreshCw,
  Clock,
  Loader2,
  History,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Edit,
} from "lucide-react";

import { productsApi } from "@/lib/ecommerce-api";

interface ProductItem {
  id: string;
  nama: string;
  status: string;
  gambarUrl?: string;
  category?: { nama: string };
  harga: number | string;
  stok: number | string;
  satuan?: string;
  varian?: {
    id: string;
    ukuranKg: number;
    stokKemasan: number;
    isActive: boolean;
  }[];
}

interface StockLog {
  id: string;
  produkId: string;
  produkNama: string;
  gambarUrl?: string;
  change: number;
  tipe: "MASUK" | "KELUAR" | "PERUBAHAN";
  keterangan: string;
  timestamp: string;
}

export default function SellerProductStockDetailPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params?.id as string;

  // State
  const [product, setProduct] = useState<ProductItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [adjustType, setAdjustType] = useState<"masuk" | "keluar">("masuk");
  const [adjustQty, setAdjustQty] = useState<number>(1);
  const [notes, setNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<StockLog[]>([]);
  const [historyTab, setHistoryTab] = useState<
    "masuk" | "keluar" | "perubahan"
  >("masuk");

  const targetStock = useMemo(() => {
    if (!product) return 0;
    const current = Number(product.stok) || 0;
    const qty = adjustQty;
    if (adjustType === "masuk") {
      return current + qty;
    } else {
      return Math.max(0, current - qty);
    }
  }, [product, adjustType, adjustQty]);

  // Fetch product detail and history logs
  const fetchProductDetails = useCallback(async () => {
    if (!productId) return;
    try {
      setLoading(true);
      setErrorText("");

      const res = await productsApi.getById(productId);
      const prodData = res?.data?.data || res?.data;
      if (prodData) {
        setProduct(prodData);
      } else {
        throw new Error("Produk tidak ditemukan");
      }

      // Fetch real stock history from backend
      try {
        const historyRes = await productsApi.getStockHistory(productId);
        const historyData =
          historyRes?.data?.data?.data || historyRes?.data?.data || [];

        if (Array.isArray(historyData) && historyData.length > 0) {
          const mappedLogs: StockLog[] = historyData.map((log: any) => {
            let logType: "MASUK" | "KELUAR" | "PERUBAHAN" = "MASUK";
            if (log.tipe === "OUT") logType = "KELUAR";
            if (log.tipe === "ADJUSTMENT") logType = "PERUBAHAN";

            return {
              id: log.id,
              produkId: log.produkId,
              produkNama: prodData.nama,
              gambarUrl: prodData.gambarUrl,
              change: log.tipe === "OUT" ? -log.kuantitas : log.kuantitas,
              tipe: logType,
              keterangan:
                log.catatan ||
                (log.tipe === "IN"
                  ? "Stok Masuk"
                  : log.tipe === "OUT"
                    ? "Stok Keluar"
                    : "Penyesuaian Stok"),
              timestamp: log.createdAt,
            };
          });
          setHistoryLogs(mappedLogs);
        } else {
          // Fallback to localStorage
          if (typeof window !== "undefined") {
            const localData = localStorage.getItem(
              "agrojabar_seller_stock_history_v2",
            );
            if (localData) {
              setHistoryLogs(JSON.parse(localData));
            }
          }
        }
      } catch (historyErr) {
        console.error(
          "Failed to fetch product stock history from API",
          historyErr,
        );
        // Fallback to localStorage
        if (typeof window !== "undefined") {
          const localData = localStorage.getItem(
            "agrojabar_seller_stock_history_v2",
          );
          if (localData) {
            setHistoryLogs(JSON.parse(localData));
          }
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch product stock details:", err);
      setErrorText(err.message || "Gagal memuat detail produk.");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchProductDetails();
  }, [fetchProductDetails]);

  // Specific logs for this product, filtered by tab
  const filteredProductLogs = useMemo(() => {
    return historyLogs.filter((log) => {
      if (log.produkId !== productId) return false;
      if (historyTab === "masuk") return log.tipe === "MASUK";
      if (historyTab === "keluar") return log.tipe === "KELUAR";
      if (historyTab === "perubahan") return log.tipe === "PERUBAHAN";
      return true;
    });
  }, [historyLogs, productId, historyTab]);

  const handleSaveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    const qty = adjustQty;
    if (qty <= 0) {
      alert("Jumlah penyesuaian harus lebih dari 0.");
      return;
    }

    setIsUpdating(true);
    try {
      // Gunakan endpoint /stock yang benar dengan tipe IN/OUT/ADJUSTMENT
      const tipe = adjustType === "masuk" ? "IN" : "OUT";

      await productsApi.updateStock(product.id, {
        tipe,
        kuantitas: qty,
        catatan:
          notes.trim() ||
          `Penyesuaian manual — ${adjustType === "masuk" ? "Stok Masuk" : "Stok Keluar"}: ${qty} ${product.satuan || "unit"}`,
      });

      // Reset local edit states & refetch (riwayat dari backend, bukan localStorage)
      setIsEditing(false);
      setAdjustQty(1);
      setNotes("");
      fetchProductDetails();
    } catch (err: any) {
      console.error("Failed to update stock:", err);
      alert(err.message || "Gagal menyimpan penyesuaian stok.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-32 space-y-4">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
        <p className="text-sm font-medium text-slate-400">
          Memuat detail stok produk...
        </p>
      </div>
    );
  }

  if (errorText || !product) {
    return (
      <div className="space-y-6 max-w-xl mx-auto py-12">
        <div className="bg-rose-50/50 border border-rose-100 text-rose-700 p-5 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
          <div className="space-y-0.5">
            <h3 className="font-medium text-sm text-rose-800">
              Gagal Memuat Detail
            </h3>
            <p className="text-xs text-rose-600 leading-relaxed">
              {errorText || "Produk tidak ditemukan."}
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push("/seller/stok")}
          className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-medium transition-all"
        >
          Kembali ke Pengelolaan Stok
        </button>
      </div>
    );
  }

  const s = Number(product.stok) || 0;

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto">
      {/* Header & Navigation */}
      <div className="flex items-center gap-4 pb-4 border-b border-slate-100/80">
        <button
          onClick={() => router.push("/seller/stok")}
          className="p-2 border border-slate-100 hover:bg-slate-50 text-slate-500 rounded-2xl transition-all shadow-sm shrink-0 active:scale-[0.98]"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span>Pengelolaan Stok</span>
            <span>/</span>
            <span className="text-slate-500">Detail & Penyesuaian</span>
          </div>
          <h1 className="text-lg md:text-xl font-medium tracking-tight text-slate-800">
            {product.nama}
          </h1>
        </div>
      </div>

      {/* Top Section: Product Details and Edit Form */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
        {!isEditing ? (
          /* Compact View when NOT editing */
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Product Details Left */}
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-xl overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
                {product.gambarUrl ? (
                  <img
                    src={product.gambarUrl}
                    alt={product.nama}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package className="w-6 h-6 text-slate-300" />
                )}
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-100/50 font-medium">
                    {product.category?.nama || "Lainnya"}
                  </span>
                </div>
                <h4 className="text-[14px] font-medium text-slate-800 truncate leading-none">
                  {product.nama}
                </h4>
                <p className="text-[11px] text-slate-400 font-medium">
                  Rp {Number(product.harga).toLocaleString("id-ID")}
                </p>
              </div>
            </div>

            {/* Current Stock & Edit Button Right */}
            <div className="flex items-center gap-6 shrink-0 self-end sm:self-auto">
              <div className="text-right">
                <span className="text-[9px] text-slate-400 font-medium block uppercase tracking-wider mb-0.5">
                  Stok Saat Ini
                </span>
                <div className="flex items-center gap-2 justify-end mb-1">
                  <span className="text-base font-medium text-slate-700">
                    {product.stok}
                  </span>
                  <span className="text-xs font-normal text-slate-400">
                    {product.satuan || "unit"}
                  </span>
                  {s === 0 ? (
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-medium uppercase bg-rose-50 text-rose-500 border border-rose-100">
                      Habis
                    </span>
                  ) : s < 10 ? (
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-medium uppercase bg-amber-50 text-amber-500 border border-amber-100">
                      Rendah
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-medium uppercase bg-emerald-50 text-emerald-600 border border-emerald-100">
                      Cukup
                    </span>
                  )}
                </div>

                {product.varian && product.varian.length > 0 && (
                  <div className="flex flex-wrap justify-end gap-1.5 max-w-[200px] mt-1.5">
                    {product.varian.map((v) => (
                      <div
                        key={v.id}
                        className="text-[10px] px-2 py-0.5 rounded bg-emerald-50/50 text-emerald-600 border border-emerald-100/50 flex gap-1"
                      >
                        <span className="font-semibold">{v.ukuranKg}kg:</span>
                        <span>{v.stokKemasan}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium transition-all shadow-sm active:scale-[0.98] flex items-center gap-1.5 h-[36px]"
              >
                <Edit className="w-3.5 h-3.5" />
                Ubah Stok
              </button>
            </div>
          </div>
        ) : (
          /* Side-by-Side layout when editing */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Column 1: Info & Current Stock */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Product Card Row */}
              <div className="flex gap-3 p-3 bg-slate-50/50 border border-slate-100/50 rounded-2xl">
                <div className="w-12 h-12 bg-white border border-slate-100 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                  {product.gambarUrl ? (
                    <img
                      src={product.gambarUrl}
                      alt={product.nama}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-6 h-6 text-slate-300" />
                  )}
                </div>
                <div className="space-y-1 min-w-0 flex-1 justify-center flex flex-col">
                  <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white text-slate-500 border border-slate-100/50 font-medium self-start leading-none">
                    {product.category?.nama || "Lainnya"}
                  </span>
                  <h4 className="text-[13px] font-medium text-slate-800 truncate leading-tight">
                    {product.nama}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Rp {Number(product.harga).toLocaleString("id-ID")}
                  </p>
                </div>
              </div>

              {/* Current Stock block */}
              <div className="p-3 bg-slate-50/50 border border-slate-100/50 rounded-2xl flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-[9px] text-slate-400 font-medium block uppercase tracking-wider mb-0.5">
                      Stok Saat Ini
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-medium text-slate-700">
                        {product.stok}
                      </span>
                      <span className="text-xs font-normal text-slate-400">
                        {product.satuan || "unit"}
                      </span>
                    </div>
                  </div>
                  <div>
                    {s === 0 ? (
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-medium uppercase bg-rose-50 text-rose-500 border border-rose-100">
                        Habis
                      </span>
                    ) : s < 10 ? (
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-medium uppercase bg-amber-50 text-amber-500 border border-amber-100">
                        Rendah
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-medium uppercase bg-emerald-50 text-emerald-600 border border-emerald-100">
                        Cukup
                      </span>
                    )}
                  </div>
                </div>

                {product.varian && product.varian.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-slate-100/80">
                    {product.varian.map((v) => (
                      <div
                        key={v.id}
                        className="text-[10px] px-2 py-0.5 rounded bg-emerald-50/50 text-emerald-600 border border-emerald-100/50 flex gap-1"
                      >
                        <span className="font-semibold">{v.ukuranKg}kg:</span>
                        <span>{v.stokKemasan}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Column 2: Adjust Stock Form */}
            <form
              onSubmit={handleSaveStock}
              className="space-y-4 border-t border-slate-100/80 pt-4 lg:border-t-0 lg:pt-0 lg:border-l lg:border-slate-100/80 lg:pl-6 animate-in fade-in duration-200"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tipe Penyesuaian */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">
                    Tipe Penyesuaian
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustType("masuk")}
                      className={`py-2 px-3 rounded-xl border text-[11px] font-medium transition-all text-center ${
                        adjustType === "masuk"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      Stok Masuk (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustType("keluar")}
                      className={`py-2 px-3 rounded-xl border text-[11px] font-medium transition-all text-center ${
                        adjustType === "keluar"
                          ? "bg-rose-50 border-rose-200 text-rose-700"
                          : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      Stok Keluar (-)
                    </button>
                  </div>
                </div>

                {/* Jumlah Perubahan */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">
                    Jumlah Perubahan
                  </label>
                  <div className="flex items-center justify-between bg-slate-50/50 border border-slate-100/50 rounded-xl p-1 h-[36px]">
                    <button
                      type="button"
                      disabled={adjustQty <= 1}
                      onClick={() =>
                        setAdjustQty((prev) => Math.max(1, prev - 1))
                      }
                      className="w-7 h-7 flex items-center justify-center bg-white border border-slate-100 rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.95] transition-all text-xs font-medium shadow-sm"
                    >
                      -
                    </button>

                    <div className="flex items-baseline gap-1 px-2">
                      <span className="text-xs font-medium text-slate-700">
                        {adjustQty}
                      </span>
                      <span className="text-[9px] text-slate-400 font-normal">
                        {product.satuan || "unit"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAdjustQty((prev) => prev + 1)}
                      className="w-7 h-7 flex items-center justify-center bg-white border border-slate-100 rounded-lg text-slate-500 hover:bg-slate-50 active:scale-[0.95] transition-all text-xs font-medium shadow-sm"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Presets row */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">
                  Pilihan Cepat Tambah Jumlah
                </label>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {[1, 5, 10, 50, 100].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAdjustQty((prev) => prev + val)}
                      className="px-2.5 py-1 bg-white border border-slate-100 hover:bg-slate-50 rounded-lg text-[10px] font-medium text-slate-600 transition-all active:scale-[0.95] shadow-sm"
                    >
                      +{val}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={adjustQty === 1}
                    onClick={() => setAdjustQty(1)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-medium text-slate-500 transition-all active:scale-[0.95] disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Reset ke 1
                  </button>
                </div>
              </div>

              {/* Stock Delta Badge */}
              <div
                className={`p-3 rounded-xl border text-[11px] font-medium flex items-center gap-2 ${
                  adjustType === "masuk"
                    ? "bg-emerald-50/40 border-emerald-100 text-emerald-700"
                    : "bg-rose-50/40 border-rose-100 text-rose-600"
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Stok akan berubah dari{" "}
                  <span className="font-medium text-slate-700">
                    {product.stok}
                  </span>{" "}
                  menjadi{" "}
                  <span className="font-medium text-slate-950">
                    {targetStock}
                  </span>{" "}
                  (Selisih:{" "}
                  {adjustType === "masuk" ? `+${adjustQty}` : `-${adjustQty}`}{" "}
                  {product.satuan || "unit"}).
                </span>
              </div>

              {/* Notes Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">
                  Catatan / Alasan Penyesuaian
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Penerimaan pengajuan kiriman stok, koreksi selisih hitung fisik..."
                  rows={2}
                  className="w-full p-3 bg-slate-50/50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 rounded-xl text-xs placeholder-slate-400 font-normal text-slate-700 resize-none transition-all"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setAdjustQty(1);
                    setNotes("");
                  }}
                  className="flex-1 py-2 border border-slate-100 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-medium transition-all active:scale-[0.98]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUpdating || adjustQty <= 0}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Penyesuaian"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Bottom Section: Riwayat Mutasi Produk (Spans entire width) */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="pb-3 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
              <History size={13} />
            </div>
            <span className="text-[13px] font-medium text-slate-700">
              Riwayat Mutasi Produk
            </span>
          </div>

          {/* TAB-3: Stok Masuk vs Stok Keluar vs Perubahan */}
          <div className="flex items-center gap-1 p-1 bg-gray-50 rounded-xl border border-slate-100/50 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setHistoryTab("masuk")}
              className={`flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                historyTab === "masuk"
                  ? "bg-white text-emerald-600 shadow-sm border border-slate-100/30"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <TrendingUp size={10} />
              Masuk
            </button>
            <button
              type="button"
              onClick={() => setHistoryTab("keluar")}
              className={`flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                historyTab === "keluar"
                  ? "bg-white text-rose-600 shadow-sm border border-rose-100"
                  : "text-gray-500 hover:text-rose-600"
              }`}
            >
              <TrendingDown size={10} />
              Keluar
            </button>
            <button
              type="button"
              onClick={() => setHistoryTab("perubahan")}
              className={`flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                historyTab === "perubahan"
                  ? "bg-white text-blue-600 shadow-sm border border-slate-100/30"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <RefreshCw size={10} />
              Perubahan
            </button>
          </div>
        </div>

        {/* Timeline Feed / Table */}
        {filteredProductLogs.length === 0 ? (
          <div className="text-center py-14 space-y-2">
            <Clock className="w-8 h-8 text-slate-200 mx-auto" />
            <p className="text-[11px] text-slate-400 font-medium">
              Tidak ada mutasi{" "}
              {historyTab === "masuk"
                ? "stok masuk"
                : historyTab === "keluar"
                  ? "stok keluar"
                  : "perubahan stok"}{" "}
              untuk produk ini.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-3 text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                      Tanggal & Waktu
                    </th>
                    <th className="p-3 text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                      Tipe Mutasi
                    </th>
                    <th className="p-3 text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                      Keterangan / Alasan
                    </th>
                    <th className="p-3 text-[10px] text-slate-400 font-medium uppercase tracking-wider text-right">
                      Perubahan Stok
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredProductLogs.map((log) => {
                    const isKeluar = log.tipe === "KELUAR";
                    const isChange = log.tipe === "PERUBAHAN";
                    const isMasuk = log.tipe === "MASUK";
                    const textColor = isChange
                      ? "text-blue-600"
                      : isMasuk
                        ? "text-emerald-600"
                        : "text-rose-500";
                    // KELUAR = merah + tanda minus, MASUK = hijau + tanda plus
                    const displayChange = isChange
                      ? log.change >= 0
                        ? `+${Math.abs(log.change)}`
                        : `-${Math.abs(log.change)}`
                      : isKeluar
                        ? `-${Math.abs(log.change)}`
                        : `+${Math.abs(log.change)}`;

                    return (
                      <tr
                        key={log.id}
                        className={`transition-colors ${isKeluar ? "bg-rose-50/30 hover:bg-rose-50/50" : "hover:bg-slate-50/50"}`}
                      >
                        <td className="p-3 text-xs font-normal text-slate-500">
                          {new Date(log.timestamp).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="p-3">
                          {isChange ? (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-medium uppercase bg-blue-50 text-blue-600 border border-blue-100">
                              Perubahan
                            </span>
                          ) : isMasuk ? (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-medium uppercase bg-emerald-50 text-emerald-600 border border-emerald-100">
                              Stok Masuk
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-medium uppercase bg-rose-50 text-rose-500 border border-rose-100">
                              Stok Keluar
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-xs font-normal text-slate-600 max-w-sm truncate">
                          {log.keterangan}
                        </td>
                        <td
                          className={`p-3 text-xs font-medium text-right ${textColor}`}
                        >
                          {displayChange} {product.satuan || "unit"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden relative border-l border-slate-100 pl-4 py-2 space-y-5">
              {filteredProductLogs.map((log) => {
                const isKeluar = log.tipe === "KELUAR";
                const isChange = log.tipe === "PERUBAHAN";
                const isMasuk = log.tipe === "MASUK";
                const bulletColor = isChange
                  ? "bg-blue-500"
                  : isMasuk
                    ? "bg-emerald-500"
                    : "bg-rose-500";
                const textColor = isChange
                  ? "text-blue-600"
                  : isMasuk
                    ? "text-emerald-600"
                    : "text-rose-500";
                const displayChange = isChange
                  ? log.change >= 0
                    ? `+${Math.abs(log.change)}`
                    : `-${Math.abs(log.change)}`
                  : isKeluar
                    ? `-${Math.abs(log.change)}`
                    : `+${Math.abs(log.change)}`;

                return (
                  <div key={log.id} className="relative group text-left">
                    <span
                      className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm flex items-center justify-center shrink-0 ${bulletColor}`}
                    />

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-normal leading-normal block">
                        {log.keterangan}
                      </span>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] text-slate-300 font-medium block">
                          {new Date(log.timestamp).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>

                        <span
                          className={`text-[11px] font-medium flex-shrink-0 ${textColor}`}
                        >
                          {displayChange}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
