"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileSpreadsheet,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Warehouse,
  Plus,
  Trash2,
  CheckCircle,
  CheckCircle2,
  Package,
  ShoppingCart,
  Split,
  Layers,
  ClipboardList,
} from "lucide-react";

import { gudangApi } from "@/lib/ecommerce-api";

// ─── Constants ─────────────────────────────────────────────────────────────────
const CART_KEY = "pengajuan_cart";
const RETAIL_KG = 1.0; // Retail = 1 kg / pack
const MEDIUM_KG = 2.5; // Medium = 2.5 kg / pack

// ─── Interfaces ────────────────────────────────────────────────────────────────
interface ProductData {
  id: string;
  nama: string;
  varianProduk?: string | null;
  hargaGudang: number;
  satuan: string;
  minimalPembelianKg?: number;
  gambarUrl?: string;
}

interface GudangData {
  id: string;
  nama: string;
  alamat: string;
}

/** Item per produk — disimpan hanya jumlah pack per kemasan */
interface FormItem {
  produkGudangId: string;
  packRetail: number; // jumlah pack 1 kg
  packMedium: number; // jumlah pack 2.5 kg
}

interface CartStorage {
  gudangId: string;
  items: FormItem[];
}

// ─── Helper ────────────────────────────────────────────────────────────────────
const totalKgOf = (it: { packRetail: number; packMedium: number }) =>
  Math.round((it.packRetail * RETAIL_KG + it.packMedium * MEDIUM_KG) * 10) / 10;

/**
 * Bagi total kg rata ke dua kemasan (50% medium, 50% retail).
 * Medium dibulatkan ke bawah, sisa kg masuk retail (1 kg pas).
 */
function bagiRata(targetKg: number): {
  packRetail: number;
  packMedium: number;
} {
  const safe = Math.max(0, targetKg);
  const setengah = safe / 2;
  const packMedium = Math.floor(setengah / MEDIUM_KG);
  const kgMedium = packMedium * MEDIUM_KG;
  const sisaKg = Math.round((safe - kgMedium) * 10) / 10;
  const packRetail = Math.ceil(sisaKg / RETAIL_KG);
  return { packRetail, packMedium };
}

// ─── localStorage ──────────────────────────────────────────────────────────────
function loadCart(): CartStorage | null {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartStorage) : null;
  } catch {
    return null;
  }
}
function saveCart(gudangId: string, items: FormItem[]) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify({ gudangId, items }));
  } catch {
    /* ignore */
  }
}
function clearCart() {
  try {
    localStorage.removeItem(CART_KEY);
  } catch {
    /* ignore */
  }
}

/** Migrasi item lama (format berbeda) → ke format pack */
function normalizeItem(raw: any): FormItem {
  if (
    typeof raw?.packRetail === "number" ||
    typeof raw?.packMedium === "number"
  ) {
    return {
      produkGudangId: raw.produkGudangId,
      packRetail: Number(raw.packRetail) || 0,
      packMedium: Number(raw.packMedium) || 0,
    };
  }
  // Format dari halaman daftar produk: { jumlahPermintaan, ukuranKemasanKg, jumlahKemasan }
  // atau format lama berbasis totalKg → defaultkan semua retail 1 kg
  const total = Number(raw?.jumlahPermintaan) || Number(raw?.totalKg) || 0;
  return {
    produkGudangId: raw.produkGudangId,
    packRetail: total,
    packMedium: 0,
  };
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function NewStockRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gudangId = searchParams.get("gudangId") || "";

  const [gudang, setGudang] = useState<GudangData | null>(null);
  const [availableProducts, setAvailableProducts] = useState<ProductData[]>([]);
  const [items, setItems] = useState<FormItem[]>([]);
  // Toggle "custom kemasan" per produk (key = produkGudangId)
  const [customMode, setCustomMode] = useState<Record<string, boolean>>({});
  // Target kg acuan per produk (untuk bagi rata di mode custom)
  const [targetKg, setTargetKg] = useState<Record<string, number>>({});
  const [catatan, setCatatan] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successGudangNama, setSuccessGudangNama] = useState("");

  // ── Init ─────────────────────────────────────────────────────────────────────
  const initPage = useCallback(async () => {
    if (!gudangId) {
      router.push("/seller/gudang/produk");
      return;
    }
    try {
      setLoading(true);

      const prodRes = await gudangApi.getProductsForRequest(gudangId);
      const responseData =
        prodRes?.data?.data?.data || prodRes?.data?.data || prodRes?.data || {};
      const products: ProductData[] = Array.isArray(responseData.products)
        ? responseData.products
        : [];
      setAvailableProducts(products);

      try {
        const whRes = await gudangApi.getAllWarehousesForMarketplace();
        const allWh = whRes?.data?.data || whRes?.data || [];
        const found = Array.isArray(allWh)
          ? allWh.find((w: any) => w.id === gudangId)
          : null;
        if (found)
          setGudang({ id: found.id, nama: found.nama, alamat: found.alamat });
      } catch {
        /* best-effort */
      }

      // Restore cart
      const saved = loadCart();
      if (saved?.gudangId === gudangId && saved.items.length > 0) {
        const valid = saved.items
          .filter((it) => products.some((p) => p.id === it.produkGudangId))
          .map(normalizeItem);
        if (valid.length > 0) {
          setItems(valid);
          return;
        }
      }

      // Draft dari sessionStorage
      try {
        const raw = sessionStorage.getItem("pengajuan_draft");
        if (raw) {
          const draft = JSON.parse(raw) as {
            gudangId: string;
            produkIds: string[];
          };
          if (draft?.gudangId === gudangId && draft.produkIds?.length > 0) {
            const newItems: FormItem[] = draft.produkIds
              .filter((pid) => products.some((p) => p.id === pid))
              .map((pid) => {
                const prod = products.find((p) => p.id === pid);
                // default: semua retail 1 kg sebanyak minimal pembelian (dari DB, default 300)
                const minKg = prod?.minimalPembelianKg ?? 300;
                return {
                  produkGudangId: pid,
                  packRetail: minKg,
                  packMedium: 0,
                };
              });
            setItems(newItems);
            saveCart(gudangId, newItems);
          }
          sessionStorage.removeItem("pengajuan_draft");
        }
      } catch {
        /* ignore */
      }
    } catch (err: any) {
      setError(err.message || "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, [gudangId, router]);

  useEffect(() => {
    initPage();
  }, [initPage]);

  useEffect(() => {
    if (gudangId && items.length > 0) saveCart(gudangId, items);
  }, [items, gudangId]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const updateItem = (index: number, patch: Partial<FormItem>) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      saveCart(gudangId, next);
      return next;
    });
  };

  const handlePackChange = (
    index: number,
    field: "packRetail" | "packMedium",
    value: string,
  ) => {
    const n = value === "" ? 0 : Math.max(0, parseInt(value, 10) || 0);
    updateItem(index, { [field]: n } as Partial<FormItem>);
  };

  // Bagi target kg (acuan input) jadi 50:50 ke dua kemasan
  const handleBagiRata = (index: number, produkId: string) => {
    const target = targetKg[produkId] ?? totalKgOf(items[index]);
    if (target <= 0) return;
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...bagiRata(target) };
      saveCart(gudangId, next);
      return next;
    });
  };

  // Toggle custom kemasan.
  const toggleCustomMode = (index: number, produkId: string) => {
    const nextOn = !customMode[produkId];
    setCustomMode((prev) => ({ ...prev, [produkId]: nextOn }));
    if (nextOn) {
      // Aktifkan: jadikan total kg saat ini sebagai target acuan
      setTargetKg((prev) => ({ ...prev, [produkId]: totalKgOf(items[index]) }));
    } else {
      // Matikan: konversi semua ke kemasan 1 kg
      setItems((prev) => {
        const next = [...prev];
        const total = totalKgOf(next[index]);
        next[index] = {
          ...next[index],
          packRetail: Math.round(total),
          packMedium: 0,
        };
        saveCart(gudangId, next);
        return next;
      });
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) clearCart();
      else saveCart(gudangId, next);
      return next;
    });
  };

  const handleTambahProduk = () => {
    const existingIds = items.map((it) => it.produkGudangId).filter(Boolean);
    sessionStorage.setItem(
      "pengajuan_draft",
      JSON.stringify({ gudangId, produkIds: existingIds }),
    );
    router.push(`/seller/gudang/produk?gudangId=${gudangId}`);
  };

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!gudangId) {
      setError("Gudang tidak ditemukan.");
      return;
    }

    const validItems = items.filter(
      (it) => it.produkGudangId && totalKgOf(it) > 0,
    );
    if (validItems.length === 0) {
      setError(
        "Belum ada produk dengan jumlah. Tambahkan produk dan isi pack.",
      );
      return;
    }

    for (const it of validItems) {
      const prod = availableProducts.find((p) => p.id === it.produkGudangId);
      const nama = prod?.varianProduk
        ? `${prod.nama} ${prod.varianProduk}`
        : (prod?.nama ?? "produk");
      const min = prod?.minimalPembelianKg ?? 300;
      const total = totalKgOf(it);
      if (total < min) {
        setError(
          `Total "${nama}" minimal ${min} ${prod?.satuan ?? "kg"} (saat ini ${total} kg).`,
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      const apiItems: any[] = [];
      for (const it of validItems) {
        if (it.packMedium > 0) {
          apiItems.push({
            produkGudangId: it.produkGudangId,
            jumlahPermintaan: it.packMedium * MEDIUM_KG,
            ukuranKemasanKg: MEDIUM_KG,
            jumlahKemasan: it.packMedium,
            totalKg: it.packMedium * MEDIUM_KG,
          });
        }
        if (it.packRetail > 0) {
          apiItems.push({
            produkGudangId: it.produkGudangId,
            jumlahPermintaan: it.packRetail * RETAIL_KG,
            ukuranKemasanKg: RETAIL_KG,
            jumlahKemasan: it.packRetail,
            totalKg: it.packRetail * RETAIL_KG,
          });
        }
      }

      await gudangApi.createStockRequest({
        gudangId,
        catatan,
        items: apiItems,
      });
      clearCart();
      setSuccessGudangNama(gudang?.nama || "Gudang");
      setShowSuccessModal(true);
    } catch (err: any) {
      setError(err.message || "Gagal mengirim pengajuan stok.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-32 space-y-4">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">
          Mempersiapkan pengajuan...
        </p>
      </div>
    );
  }

  // ── Totals ────────────────────────────────────────────────────────────────────
  const totalKgAll = items.reduce((s, it) => s + totalKgOf(it), 0);
  const totalHargaAll = items.reduce((s, it) => {
    const prod = availableProducts.find((p) => p.id === it.produkGudangId);
    return s + (prod?.hargaGudang || 0) * totalKgOf(it);
  }, 0);
  const hasValid =
    items.filter((it) => it.produkGudangId && totalKgOf(it) > 0).length > 0;

  return (
    <div className="w-full space-y-6 max-w-4xl">
      {/* Back */}
      <button
        onClick={() => router.push("/seller/gudang/produk")}
        className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-600 transition-colors font-medium"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Kembali ke Daftar Produk Gudang
      </button>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0 border border-emerald-100/30">
          <FileSpreadsheet className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-800">
            Buat Pengajuan Stok
          </h1>
          {gudang && (
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400">
              <Warehouse className="w-3 h-3" />
              <span>{gudang.nama}</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-xl flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
          <p className="text-xs">{error}</p>
        </div>
      )}
      {/* ── Success Modal ── */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 flex flex-col items-center text-center gap-5"
            style={{ animation: "fadeScaleIn 0.3s ease-out" }}
          >
            {/* Icon */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center border-4 border-emerald-100">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <span className="absolute -top-1 -right-1 text-2xl">🎉</span>
            </div>

            {/* Text */}
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-800">
                Pengajuan Berhasil!
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Pengajuan stok ke{" "}
                <span className="font-semibold text-emerald-600">
                  {successGudangNama}
                </span>{" "}
                telah berhasil dikirim. Tim gudang akan segera memprosesnya.
              </p>
            </div>

            {/* Info Badge */}
            <div className="w-full bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-center gap-3">
              <ClipboardList className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700 text-left leading-relaxed">
                Pantau status pengajuan di halaman{" "}
                <strong>Status Pengajuan Stok</strong>.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2.5 w-full">
              <button
                onClick={() => router.push("/seller/pengajuan-stok")}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-semibold transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2"
              >
                <ClipboardList className="w-4 h-4" />
                Lihat Status Pengajuan
              </button>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  router.push("/seller/gudang/produk");
                }}
                className="w-full py-2.5 border border-slate-200 text-slate-600 rounded-2xl text-sm font-medium hover:bg-slate-50 transition-all active:scale-[0.98]"
              >
                Buat Pengajuan Baru
              </button>
            </div>
          </div>

          <style jsx>{`
            @keyframes fadeScaleIn {
              from { opacity: 0; transform: scale(0.88); }
              to { opacity: 1; transform: scale(1); }
            }
          `}</style>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200/60 rounded-2xl p-5 md:p-6 shadow-sm space-y-6"
      >
        {/* Daftar produk */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-[10.5px] font-medium uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShoppingCart className="w-3.5 h-3.5 text-emerald-600/70" />
              Produk yang Diajukan
              {items.length > 0 && (
                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {items.length}
                </span>
              )}
            </h3>
            <button
              type="button"
              onClick={handleTambahProduk}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 border border-emerald-100 active:scale-[0.98]"
            >
              <Plus className="w-3 h-3" />
              Tambah Produk
            </button>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl space-y-3">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
                <Package className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Belum ada produk dipilih
              </p>
              <button
                type="button"
                onClick={handleTambahProduk}
                className="mx-auto px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-medium hover:bg-emerald-700 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Pilih Produk dari Gudang
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => {
                const prod = availableProducts.find(
                  (p) => p.id === item.produkGudangId,
                );
                if (!prod) return null;
                const minKg = prod.minimalPembelianKg ?? 300;
                const total = totalKgOf(item);
                const isBelowMin = total > 0 && total < minKg;

                return (
                  <div
                    key={index}
                    className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-all ${isBelowMin ? "border-rose-200" : "border-slate-200/70"}`}
                  >
                    {/* Produk info */}
                    <div className="px-4 pt-3.5 pb-3 border-b border-slate-100/80 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                        {prod.gambarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={prod.gambarUrl}
                            alt={prod.nama}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <Package className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {prod.varianProduk
                            ? `${prod.nama} ${prod.varianProduk}`
                            : prod.nama}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Rp {prod.hargaGudang.toLocaleString("id-ID")} /{" "}
                          {prod.satuan}
                          <span className="ml-2 text-amber-600 font-medium">
                            · Min. {minKg} {prod.satuan}
                          </span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 transition-all shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Input utama: jumlah kemasan 1 kg + toggle custom */}
                    <div className="px-4 pt-3.5 pb-3 bg-slate-50/40 border-b border-slate-100/70">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                          {customMode[prod.id]
                            ? "Target Total (Acuan Bagi)"
                            : "Jumlah Pesanan"}
                        </label>
                        {/* Toggle custom kemasan */}
                        <button
                          type="button"
                          onClick={() => toggleCustomMode(index, prod.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all border ${
                            customMode[prod.id]
                              ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                              : "bg-white border-slate-200 text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          <Layers className="w-3 h-3" />
                          Multi Kemasan
                          <span
                            className={`w-6 h-3.5 rounded-full relative transition-all ${customMode[prod.id] ? "bg-emerald-500" : "bg-slate-300"}`}
                          >
                            <span
                              className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${customMode[prod.id] ? "left-3" : "left-0.5"}`}
                            />
                          </span>
                        </button>
                      </div>
                      <div className="relative">
                        {customMode[prod.id] ? (
                          <input
                            type="number"
                            min={0}
                            placeholder={`mis. ${minKg}`}
                            value={targetKg[prod.id] || ""}
                            onChange={(e) =>
                              setTargetKg((prev) => ({
                                ...prev,
                                [prod.id]: Math.max(
                                  0,
                                  parseFloat(e.target.value) || 0,
                                ),
                              }))
                            }
                            className="w-full pl-4 pr-12 py-2.5 border border-emerald-200 rounded-xl text-base font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all bg-white"
                          />
                        ) : (
                          <input
                            type="number"
                            min={0}
                            placeholder={`mis. ${minKg}`}
                            value={item.packRetail || ""}
                            onChange={(e) =>
                              handlePackChange(
                                index,
                                "packRetail",
                                e.target.value,
                              )
                            }
                            className="w-full pl-4 pr-12 py-2.5 border border-emerald-200 rounded-xl text-base font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all bg-white"
                          />
                        )}
                        <span className="absolute right-4 top-3 text-sm text-slate-400 font-medium">
                          kg
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1.5">
                        {customMode[prod.id]
                          ? "Masukkan target total, lalu klik Bagi 50:50 untuk membaginya ke 2 kemasan."
                          : "Default semua kemasan 1 kg. Aktifkan Multi Kemasan untuk membagi ke 2.5 kg."}
                      </p>
                    </div>

                    {/* 3 card berjajar — hanya saat Multi Kemasan aktif */}
                    {customMode[prod.id] && (
                      <div className="px-4 py-4 bg-white grid grid-cols-3 gap-3">
                        {/* Bagi Rata */}
                        <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 overflow-hidden flex flex-col">
                          <div className="px-3 py-2 flex items-center gap-2 border-b border-emerald-100/70">
                            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                              <Split className="w-3.5 h-3.5" />
                            </div>
                            <div className="leading-tight">
                              <p className="text-xs font-bold text-emerald-700">
                                Bagi Rata
                              </p>
                              <p className="text-[9px] text-emerald-600/70">
                                50:50
                              </p>
                            </div>
                          </div>
                          <div className="p-3 flex-1 flex flex-col justify-center">
                            <button
                              type="button"
                              onClick={() => handleBagiRata(index, prod.id)}
                              className="w-full px-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
                            >
                              <Split className="w-3.5 h-3.5" />
                              Bagi 50:50
                            </button>
                            <p className="text-[9px] text-slate-400 mt-2 text-center leading-tight">
                              Bagi{" "}
                              {(targetKg[prod.id] || 0).toLocaleString("id-ID")}{" "}
                              kg ke 2 kemasan
                            </p>
                          </div>
                        </div>

                        {/* Retail 1 kg */}
                        <div className="rounded-2xl border-2 border-emerald-100 overflow-hidden flex flex-col">
                          <div className="bg-emerald-50 px-3 py-2 flex items-center gap-2 border-b border-emerald-100/70">
                            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                              <Package className="w-3.5 h-3.5" />
                            </div>
                            <div className="leading-tight">
                              <p className="text-xs font-bold text-emerald-700">
                                1 kg
                              </p>
                              <p className="text-[9px] text-emerald-600/70">
                                Retail
                              </p>
                            </div>
                          </div>
                          <div className="p-3 space-y-2 flex-1">
                            <div className="relative">
                              <input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={item.packRetail || ""}
                                onChange={(e) =>
                                  handlePackChange(
                                    index,
                                    "packRetail",
                                    e.target.value,
                                  )
                                }
                                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold text-base focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all text-center"
                              />
                              <span className="absolute right-2.5 top-3 text-[10px] text-slate-400 font-medium">
                                pack
                              </span>
                            </div>
                            <div className="bg-emerald-50/70 rounded-lg py-1.5 text-center">
                              <span className="text-xs font-bold text-emerald-700">
                                {(item.packRetail * RETAIL_KG).toLocaleString(
                                  "id-ID",
                                )}{" "}
                                kg
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Medium 2.5 kg */}
                        <div className="rounded-2xl border-2 border-emerald-100 overflow-hidden flex flex-col">
                          <div className="bg-emerald-50 px-3 py-2 flex items-center gap-2 border-b border-emerald-100/70">
                            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                              <Package className="w-3.5 h-3.5" />
                            </div>
                            <div className="leading-tight">
                              <p className="text-xs font-bold text-emerald-700">
                                2.5 kg
                              </p>
                              <p className="text-[9px] text-emerald-600/70">
                                Medium
                              </p>
                            </div>
                          </div>
                          <div className="p-3 space-y-2 flex-1">
                            <div className="relative">
                              <input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={item.packMedium || ""}
                                onChange={(e) =>
                                  handlePackChange(
                                    index,
                                    "packMedium",
                                    e.target.value,
                                  )
                                }
                                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold text-base focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all text-center"
                              />
                              <span className="absolute right-2.5 top-3 text-[10px] text-slate-400 font-medium">
                                pack
                              </span>
                            </div>
                            <div className="bg-emerald-50/70 rounded-lg py-1.5 text-center">
                              <span className="text-xs font-bold text-emerald-700">
                                {(item.packMedium * MEDIUM_KG).toLocaleString(
                                  "id-ID",
                                )}{" "}
                                kg
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Total per produk */}
                    <div
                      className={`px-4 py-3 flex items-center justify-between text-xs border-t ${
                        isBelowMin
                          ? "bg-rose-50/50 border-rose-100 text-rose-600"
                          : "bg-emerald-50/40 border-emerald-100/60 text-slate-600"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        Total Produk:
                        <span className="font-bold text-sm">
                          {total.toLocaleString("id-ID")} kg
                        </span>
                        {isBelowMin && (
                          <span className="text-rose-500 font-medium">
                            (min. {minKg} kg)
                          </span>
                        )}
                      </span>
                      <span className="font-bold text-slate-700 text-sm">
                        Rp {(prod.hargaGudang * total).toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[11px] text-slate-500 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              Default semua dalam kemasan{" "}
              <span className="font-semibold text-slate-700">1 kg</span>.
              Tambahkan kemasan{" "}
              <span className="font-semibold text-slate-700">2.5 kg</span> bila
              perlu — total kg akan bertambah otomatis. Minimal{" "}
              <span className="font-semibold text-slate-700">300 kg</span> per
              produk. Draft tersimpan otomatis.
            </span>
          </div>
        </div>

        {/* Grand Total */}
        {hasValid && (
          <div className="flex items-center justify-between bg-emerald-700 text-white rounded-2xl px-5 py-4">
            <div>
              <p className="text-[9px] text-emerald-200/60 uppercase tracking-wider mb-0.5">
                Total Pengajuan
              </p>
              <p className="text-sm font-semibold">
                {totalKgAll.toLocaleString("id-ID")} kg
              </p>
            </div>
            <p className="font-bold text-xl">
              Rp {totalHargaAll.toLocaleString("id-ID")}
            </p>
          </div>
        )}

        {/* Catatan */}
        <div className="space-y-1.5">
          <label className="block text-[10.5px] font-medium uppercase tracking-wider text-slate-400">
            Catatan Pengiriman (Opsional)
          </label>
          <textarea
            rows={2}
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Contoh: Pengiriman via ekspedisi pickup, mohon dicek kondisi kemasan..."
            className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200/80 rounded-xl text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-xs font-normal transition-all"
          />
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={() => router.push("/seller/gudang/produk")}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-medium text-slate-500 transition-all active:scale-[0.98]"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting || !hasValid}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium transition-all shadow-sm active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Kirim Pengajuan
          </button>
        </div>
      </form>
    </div>
  );
}
