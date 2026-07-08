"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import {
  X,
  Edit,
  Loader2,
  Clock,
  TrendingDown,
  TrendingUp,
  ChevronRight,
  History,
  DollarSign,
  Check,
} from "lucide-react";

const PRICE_HISTORY_KEY = "agrojabar_seller_price_history_v1";

interface PriceHistoryLog {
  id: string;
  produkId: string;
  produkNama: string;
  hargaLama: number;
  hargaBaru: number;
  catatan: string;
  timestamp: string;
}

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  onSubmit: (data: any) => Promise<void>;
  loading: boolean;
}

const formatRupiah = (val: number | string) =>
  `Rp ${Number(val).toLocaleString("id-ID")}`;

const EditProductModal: React.FC<EditProductModalProps> = ({
  isOpen,
  onClose,
  product,
  onSubmit,
  loading,
}) => {
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    nama: "",
    namaEtalase: "",
    harga: 0,
    deskripsi: "",
    images: [] as { type: "link" | "file"; value: string }[],
  });

  // Price editing state
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [newHarga, setNewHarga] = useState<number | string>("");
  const [priceCatatan, setPriceCatatan] = useState("");

  // Price history
  const [priceHistory, setPriceHistory] = useState<PriceHistoryLog[]>([]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Load form data from product
  React.useLayoutEffect(() => {
    if (product) {
      const existingImages: { type: "link" | "file"; value: string }[] = [];
      if (product.gambarUrl)
        existingImages.push({
          type: "link" as const,
          value: product.gambarUrl,
        });
      if (product.fotoLainnya?.length > 0) {
        existingImages.push(
          ...product.fotoLainnya.map((url: string) => ({
            type: "link" as const,
            value: url,
          })),
        );
      }
      if (existingImages.length === 0)
        existingImages.push({ type: "link" as const, value: "" });

      Promise.resolve().then(() =>
        setFormData({
          nama: product.nama || "",
          namaEtalase: product.namaEtalase || "",
          harga: product.harga,
          deskripsi: product.deskripsi || "",
          images: existingImages,
        }),
      );
      setIsEditingPrice(false);
      setNewHarga("");
      setPriceCatatan("");
    }
  }, [product]);

  // Load price history from localStorage
  useEffect(() => {
    if (!product || !isOpen) return;
    try {
      const raw = localStorage.getItem(PRICE_HISTORY_KEY);
      if (raw) {
        const all: PriceHistoryLog[] = JSON.parse(raw);
        setPriceHistory(all.filter((l) => l.produkId === product.id));
      } else {
        setPriceHistory([]);
      }
    } catch {
      setPriceHistory([]);
    }
  }, [product, isOpen]);

  const handleSavePrice = () => {
    const val = Number(newHarga);
    if (!val || val <= 0) return;
    const oldHarga = Number(formData.harga);
    if (val === oldHarga) {
      setIsEditingPrice(false);
      return;
    }

    // Save log to localStorage
    const newLog: PriceHistoryLog = {
      id: `price-${product.id}-${Date.now()}`,
      produkId: product.id,
      produkNama: product.nama,
      hargaLama: oldHarga,
      hargaBaru: val,
      catatan: priceCatatan.trim() || "Penyesuaian Harga Manual",
      timestamp: new Date().toISOString(),
    };
    try {
      const raw = localStorage.getItem(PRICE_HISTORY_KEY);
      const all: PriceHistoryLog[] = raw ? JSON.parse(raw) : [];
      const updated = [newLog, ...all];
      localStorage.setItem(PRICE_HISTORY_KEY, JSON.stringify(updated));
      setPriceHistory((prev) => [newLog, ...prev]);
    } catch {
      /* ignore */
    }

    setFormData((prev) => ({ ...prev, harga: val }));
    setIsEditingPrice(false);
    setNewHarga("");
    setPriceCatatan("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Nama produk tidak dapat diubah seller — mengikuti nama dari gudang.
    // Seller hanya boleh mengubah harga, deskripsi, dan gambar.
    onSubmit({
      harga: formData.harga,
      deskripsi: formData.deskripsi,
      images: formData.images,
    });
  };

  if (!isOpen || !mounted || !product) return null;

  const stok = product.stok;
  const satuan = product.satuan || "kg";

  const modalJSX = (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 bg-white rounded-[24px] border border-slate-100 shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="space-y-0.5">
            <h3 className="text-sm font-medium text-slate-800">
              Atur Produk Etalase
            </h3>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
              {product.category?.nama || "Tanpa Kategori"}
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all active:scale-95"
          >
            <X size={15} />
          </button>
        </div>

        {/* 2-Column Body */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
          {/* LEFT: Form */}
          <form
            onSubmit={handleSubmit}
            className="flex-1 p-5 space-y-4 overflow-y-auto border-b md:border-b-0 md:border-r border-slate-100 min-w-0"
          >
            {/* Product Mini Identity */}
            <div className="flex items-center gap-3 bg-slate-50/60 p-3 rounded-2xl border border-slate-100/80">
              <div className="w-12 h-12 bg-white rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center text-xl shadow-sm border border-slate-100">
                {product.gambarUrl ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={product.gambarUrl}
                      alt={product.nama || "Produk"}
                      fill
                      sizes="48px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  "📦"
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-700 text-xs">
                  {product.nama}
                </p>
                <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                  {product.category?.nama || "Tanpa Kategori"}
                </p>
              </div>
            </div>

            {/* Label Komoditas + Nama Produk (read-only, mengikuti gudang) */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Komoditas & Nama Produk
              </label>
              <div className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2">
                {product.category?.nama && (
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100 shrink-0">
                    {product.category.nama}
                  </span>
                )}
                <span className="text-xs font-medium text-slate-600 truncate">
                  {product.nama}
                </span>
                <span className="ml-auto text-[9px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded uppercase tracking-wider font-medium shrink-0">
                  Locked
                </span>
              </div>
              <span className="text-[9px] text-slate-400 block ml-1 font-normal">
                Nama produk mengikuti data yang diterima dari gudang dan tidak
                dapat diubah.
              </span>
            </div>

            {/* Price Row */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Harga Etalase (Rp)
              </label>

              {!isEditingPrice ? (
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/60 border border-slate-200/80 rounded-xl">
                  <span className="text-xs font-medium text-emerald-700">
                    {formatRupiah(formData.harga)}
                    <span className="text-slate-400 font-normal ml-1">
                      / {satuan}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setNewHarga(Number(formData.harga));
                      setIsEditingPrice(true);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 rounded-lg text-[10px] font-medium transition-all active:scale-95"
                  >
                    <Edit size={10} />
                    Ubah Harga
                  </button>
                </div>
              ) : (
                <div className="space-y-2 p-3 bg-emerald-50/30 border border-emerald-100 rounded-xl">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={newHarga}
                      onChange={(e) => setNewHarga(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-normal transition-all"
                      placeholder="Harga baru"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSavePrice}
                      disabled={!newHarga || Number(newHarga) <= 0}
                      className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <Check size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingPrice(false);
                        setNewHarga("");
                        setPriceCatatan("");
                      }}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-all active:scale-95"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={priceCatatan}
                    onChange={(e) => setPriceCatatan(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none text-xs font-normal transition-all text-slate-600"
                    placeholder="Catatan perubahan harga (opsional)"
                  />
                  {Number(newHarga) > 0 &&
                    Number(newHarga) !== Number(formData.harga) && (
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        {Number(newHarga) > Number(formData.harga) ? (
                          <TrendingUp size={10} className="text-emerald-600" />
                        ) : (
                          <TrendingDown size={10} className="text-rose-500" />
                        )}
                        <span>
                          {formatRupiah(formData.harga)}
                          <span className="mx-1 text-slate-300">→</span>
                          <span
                            className={
                              Number(newHarga) > Number(formData.harga)
                                ? "text-emerald-600 font-medium"
                                : "text-rose-500 font-medium"
                            }
                          >
                            {formatRupiah(newHarga)}
                          </span>
                        </span>
                      </div>
                    )}
                </div>
              )}
            </div>

            {/* Stock (Read-only) */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Stok ({satuan})
              </label>
              <div className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-normal text-slate-500 flex items-center justify-between">
                <span>
                  {stok} {satuan}
                </span>
                <span className="text-[9px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded uppercase tracking-wider font-medium">
                  Read-Only
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block ml-1 font-normal">
                Stok hanya dapat ditambah melalui Pengajuan Stok.
              </span>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Deskripsi Etalase
              </label>
              <textarea
                value={formData.deskripsi}
                onChange={(e) =>
                  setFormData({ ...formData, deskripsi: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-xs font-normal leading-relaxed transition-all resize-none"
                rows={3}
                placeholder="Tuliskan deskripsi produk yang menarik..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-slate-50/80 hover:bg-slate-100/60 border border-slate-200/40 text-slate-500 rounded-xl text-xs font-medium transition-all active:scale-[0.98]"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 active:scale-[0.98]"
              >
                {loading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  "Simpan Perubahan"
                )}
              </button>
            </div>
          </form>

          {/* RIGHT: Price Change History */}
          <div className="w-full md:w-[260px] shrink-0 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 shrink-0">
              <div className="w-6 h-6 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                <History size={12} />
              </div>
              <span className="text-[12px] font-medium text-slate-700">
                Riwayat Harga
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {priceHistory.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <Clock className="w-7 h-7 text-slate-200 mx-auto" />
                  <p className="text-[10px] text-slate-400 font-medium">
                    Belum ada riwayat perubahan harga untuk produk ini.
                  </p>
                </div>
              ) : (
                <div className="relative border-l border-slate-100 pl-3.5 space-y-4">
                  {priceHistory.map((log) => {
                    const naik = log.hargaBaru > log.hargaLama;
                    return (
                      <div key={log.id} className="relative">
                        {/* Bullet */}
                        <span
                          className={`absolute -left-[19px] top-1.5 w-2 h-2 rounded-full border-2 border-white shadow-sm ${naik ? "bg-emerald-500" : "bg-rose-500"}`}
                        />

                        <div className="space-y-1">
                          {/* Price arrow */}
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[10px] text-slate-500 font-normal line-through">
                              {formatRupiah(log.hargaLama)}
                            </span>
                            <ChevronRight
                              size={10}
                              className="text-slate-300 shrink-0"
                            />
                            <span
                              className={`text-[10px] font-medium ${naik ? "text-emerald-600" : "text-rose-500"}`}
                            >
                              {formatRupiah(log.hargaBaru)}
                            </span>
                          </div>
                          {/* Catatan */}
                          {log.catatan && (
                            <p className="text-[9.5px] text-slate-400 font-normal leading-normal">
                              {log.catatan}
                            </p>
                          )}
                          {/* Timestamp */}
                          <span className="text-[9px] text-slate-300 font-medium block">
                            {new Date(log.timestamp).toLocaleDateString(
                              "id-ID",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalJSX, document.body);
};

export default EditProductModal;
