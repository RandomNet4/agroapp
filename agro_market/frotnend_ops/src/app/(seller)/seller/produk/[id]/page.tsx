"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Package,
  Store,
  Star,
  MessageSquare,
  Edit,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Flag,
  Percent,
  Tag,
  Save,
  Plus,
  X,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

import {
  productsApi,
  storesApi,
  reviewsApi,
  formatRupiah,
} from "@/lib/ecommerce-api";
import { apiClient } from "@/lib/api-client";

import ProductListSidebar from "../_components/ProductListSidebar";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductDetail {
  id: string;
  nama: string;
  status: string;
  gambarUrl?: string;
  fotoLainnya?: string[];
  category?: { nama: string };
  deskripsi?: string;
  harga: number;
  stok: number;
  satuan?: string;
  diskonPersen?: number;
  rating?: number;
  terjual?: number;
  tokoId?: string;
  namaEtalase?: string;
  masterProdukId?: string;
  masterProduk?: {
    id: string;
    nama: string;
    allowCustomName: boolean;
    namaWajibMengandung?: string;
  };
}

interface Review {
  id: string;
  rating: number;
  ulasan?: string;
  createdAt: string;
  isHidden: boolean;
  reportStatus?: string;
  reportReason?: string;
  reportedAt?: string;
  user?: { id: string; name: string };
}

interface PageParams {
  id: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusColor = (s: string) => {
  const status = s?.toLowerCase();
  if (status === "active") return "bg-emerald-100 text-emerald-700";
  if (status === "out_of_stock") return "bg-red-100 text-red-700";
  if (status === "draft") return "bg-gray-100 text-gray-500";
  return "bg-amber-100 text-amber-700";
};

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star
        key={i}
        size={13}
        className={
          i <= rating ? "text-amber-400 fill-amber-400" : "text-gray-300"
        }
      />
    ))}
  </div>
);

const reviewStatusBadge = (review: Review) => {
  if (review.isHidden)
    return (
      <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
        <ShieldX size={10} /> Takedown
      </span>
    );
  if (review.reportStatus === "REPORTED")
    return (
      <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
        <ShieldAlert size={10} /> Dilaporkan
      </span>
    );
  if (review.reportStatus === "TAKEDOWN_REJECTED")
    return (
      <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
        <ShieldCheck size={10} /> Laporan Ditolak
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
      Aktif
    </span>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function KelolaProdukPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "etalase" | "review" | "riwayat" | "margin"
  >("etalase");

  // ── Varian Kemasan State ──────────────────────────────────────────────────
  const [varians, setVarians] = useState<any[]>([]);
  const [variansLoading, setVariansLoading] = useState(false);
  const [editingVarianId, setEditingVarianId] = useState<string | null>(null);
  const [editVarianPrice, setEditVarianPrice] = useState<number>(0);

  // ── Margin State ──────────────────────────────────────────────────────────
  const [marginData, setMarginData] = useState<any>(null);
  const [marginLoading, setMarginLoading] = useState(false);
  const [marginFeedback, setMarginFeedback] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const [marginInput, setMarginInput] = useState<number>(15);
  const [priceInput, setPriceInput] = useState<number>(0);
  const [useCustomMargin, setUseCustomMargin] = useState(false);

  // ── Edit Etalase State ────────────────────────────────────────────────────
  const [editForm, setEditForm] = useState({
    harga: 0,
    stok: 0,
    deskripsi: "",
    namaEtalase: "",
    images: [] as { type: "link" | "file"; value: string }[],
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editFeedback, setEditFeedback] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Field-specific saving states ──────────────────────────────────────
  const [savingField, setSavingField] = useState<string | null>(null);
  const [fieldFeedback, setFieldFeedback] = useState<{
    field: string;
    type: "success" | "error";
    msg: string;
  } | null>(null);

  // ── Review State ──────────────────────────────────────────────────────────
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reportModal, setReportModal] = useState<Review | null>(null);
  const [reportAlasan, setReportAlasan] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportFeedback, setReportFeedback] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  // ── Stock History State ───────────────────────────────────────────────────
  const [stockHistory, setStockHistory] = useState<any[]>([]);
  const [stockHistoryLoading, setStockHistoryLoading] = useState(false);

  // ── Fetch Varian Kemasan ──────────────────────────────────────────────────
  const fetchVarians = async () => {
    setVariansLoading(true);
    try {
      const res = await apiClient.get(`/ecom-produk/${id}/varian`);
      setVarians(res.data || []);
    } catch (err) {
      console.error("Error fetching variants:", err);
    } finally {
      setVariansLoading(false);
    }
  };

  const handleUpdateVarian = async (
    varianId: string,
    biayaTambahan?: number,
    isActive?: boolean,
  ) => {
    try {
      const payload: any = {};
      if (biayaTambahan !== undefined) payload.biayaTambahan = biayaTambahan;
      if (isActive !== undefined) payload.isActive = isActive;

      await apiClient.patch(`/ecom-produk/varian/${varianId}`, payload);

      // Refresh variants & product
      await fetchVarians();
      const res = await productsApi.getById(id);
      const data = res?.data?.data || res?.data;
      if (data) {
        setProduct(data);
        setEditForm((prev) => ({
          ...prev,
          harga: data.harga,
          stok: data.stok,
        }));
      }
      setEditingVarianId(null);
    } catch (err) {
      console.error("Error updating variant:", err);
    }
  };

  // ── Fetch Product ─────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await productsApi.getById(id);
        const data = res?.data?.data || res?.data;
        if (!data) {
          setNotFound(true);
          return;
        }

        const storeRes = await storesApi.getMyStore();
        const storeData = storeRes?.data?.data || storeRes?.data;
        if (storeData?.id && data.tokoId && data.tokoId !== storeData.id) {
          setNotFound(true);
          return;
        }

        setProduct(data);
        await fetchVarians();

        const fotoList: { type: "link" | "file"; value: string }[] = [];
        if (data.gambarUrl)
          fotoList.push({ type: "link", value: data.gambarUrl });
        if (data.fotoLainnya?.length) {
          data.fotoLainnya.forEach((u: string) =>
            fotoList.push({ type: "link", value: u }),
          );
        }
        if (fotoList.length === 0) fotoList.push({ type: "link", value: "" });
        setEditForm({
          harga: data.harga,
          stok: data.stok,
          deskripsi: data.deskripsi || "",
          namaEtalase: data.namaEtalase || "",
          images: fotoList,
        });
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  // ── Fetch Reviews ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== "review" || !product) return;
    const load = async () => {
      setReviewsLoading(true);
      try {
        const res = await reviewsApi.getProductReviewsForSeller(id, {
          limit: 50,
        });
        const data = res?.data?.data || res?.data?.data?.data || [];
        setReviews(Array.isArray(data) ? data : []);
      } catch {
        setReviews([]);
      } finally {
        setReviewsLoading(false);
      }
    };
    load();
  }, [activeTab, product, id]);

  // ── Fetch Stock History ───────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== "riwayat" || !product) return;
    const load = async () => {
      setStockHistoryLoading(true);
      try {
        const res = await productsApi.getStockHistory(id, { limit: 50 });
        const data = res?.data?.data || res?.data?.data?.data || [];
        setStockHistory(Array.isArray(data) ? data : []);
      } catch {
        setStockHistory([]);
      } finally {
        setStockHistoryLoading(false);
      }
    };
    load();
  }, [activeTab, product, id]);

  // ── Save Individual Field ────────────────────────────────────────────────
  const handleSaveField = async (fieldName: string, fieldValue: any) => {
    if (!product) return;

    // Validation untuk namaEtalase
    if (fieldName === "namaEtalase" && fieldValue) {
      if (
        product.masterProdukId &&
        product.masterProduk &&
        !product.masterProduk.allowCustomName
      ) {
        setFieldFeedback({
          field: fieldName,
          type: "error",
          msg: "Produk terstandarisasi ini tidak mengizinkan kustomisasi nama etalase.",
        });
        return;
      }

      const keyword = (
        product.masterProduk?.namaWajibMengandung ||
        product.masterProduk?.nama ||
        ""
      ).toLowerCase();
      if (!fieldValue.toLowerCase().includes(keyword)) {
        setFieldFeedback({
          field: fieldName,
          type: "error",
          msg: `Nama etalase wajib mengandung kata "${product.masterProduk?.namaWajibMengandung || product.masterProduk?.nama}".`,
        });
        return;
      }
    }

    setSavingField(fieldName);
    setFieldFeedback(null);
    try {
      const updatePayload: any = {};

      if (fieldName === "deskripsi") {
        updatePayload.deskripsi = fieldValue;
      } else if (fieldName === "namaEtalase") {
        updatePayload.namaEtalase = fieldValue || null;
      } else if (fieldName === "images") {
        updatePayload.gambarUrl = fieldValue[0]?.value || undefined;
        updatePayload.fotoLainnya = fieldValue
          .slice(1)
          .map((img: any) => img.value)
          .filter(Boolean);
      }

      await productsApi.update(product.id, updatePayload);

      // Refresh product data
      const res = await productsApi.getById(id);
      const data = res?.data?.data || res?.data;
      setProduct(data);

      setFieldFeedback({
        field: fieldName,
        type: "success",
        msg: "Perubahan berhasil disimpan!",
      });

      // Auto-hide success message after 2 seconds
      setTimeout(() => {
        setFieldFeedback(null);
      }, 2000);
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setFieldFeedback({
        field: fieldName,
        type: "error",
        msg: e?.response?.data?.message || e?.message || "Gagal menyimpan.",
      });
    } finally {
      setSavingField(null);
    }
  };

  // ── Save Etalase ──────────────────────────────────────────────────────────
  const handleSaveEtalase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    // Strict client-side custom etalase name validation
    if (product.masterProdukId && editForm.namaEtalase) {
      if (product.masterProduk && !product.masterProduk.allowCustomName) {
        setEditFeedback({
          type: "error",
          msg: "Produk terstandarisasi ini tidak mengizinkan kustomisasi nama etalase.",
        });
        return;
      }

      const keyword = (
        product.masterProduk?.namaWajibMengandung ||
        product.masterProduk?.nama ||
        ""
      ).toLowerCase();
      if (!editForm.namaEtalase.toLowerCase().includes(keyword)) {
        setEditFeedback({
          type: "error",
          msg: `Nama etalase wajib mengandung kata "${product.masterProduk?.namaWajibMengandung || product.masterProduk?.nama}".`,
        });
        return;
      }
    }

    setEditLoading(true);
    setEditFeedback(null);
    try {
      await productsApi.update(product.id, {
        harga: Number(editForm.harga),
        stok: Number(editForm.stok),
        deskripsi: editForm.deskripsi,
        namaEtalase: editForm.namaEtalase || null,
        gambarUrl: editForm.images[0]?.value || undefined,
        fotoLainnya: editForm.images
          .slice(1)
          .map((img) => img.value)
          .filter(Boolean),
      });
      const res = await productsApi.getById(id);
      const data = res?.data?.data || res?.data;
      setProduct(data);
      setEditFeedback({ type: "success", msg: "Perubahan berhasil disimpan!" });
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setEditFeedback({
        type: "error",
        msg: e?.response?.data?.message || e?.message || "Gagal menyimpan.",
      });
    } finally {
      setEditLoading(false);
    }
  };

  // ── Toggle Status ─────────────────────────────────────────────────────────
  const handleToggleStatus = async () => {
    if (!product) return;
    const newStatus = product.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setActionLoading(true);
    try {
      await productsApi.updateStatus(product.id, newStatus);
      setProduct((prev) => (prev ? { ...prev, status: newStatus } : prev));
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Report Review ─────────────────────────────────────────────────────────
  const handleReport = async () => {
    if (!reportModal) return;
    if (reportAlasan.trim().length < 10) {
      setReportFeedback({
        type: "error",
        msg: "Alasan laporan minimal 10 karakter.",
      });
      return;
    }
    setReportLoading(true);
    setReportFeedback(null);
    try {
      await reviewsApi.reportReview(reportModal.id, reportAlasan.trim());
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reportModal.id ? { ...r, reportStatus: "REPORTED" } : r,
        ),
      );
      setReportFeedback({
        type: "success",
        msg: "Laporan berhasil dikirim ke admin.",
      });
      setTimeout(() => {
        setReportModal(null);
        setReportAlasan("");
        setReportFeedback(null);
      }, 1500);
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setReportFeedback({
        type: "error",
        msg:
          e?.response?.data?.message || e?.message || "Gagal mengirim laporan.",
      });
    } finally {
      setReportLoading(false);
    }
  };

  // ── Loading / 404 ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Package className="w-14 h-14 text-gray-300" />
        <p className="font-semibold text-gray-700">Produk tidak ditemukan</p>
        <button
          onClick={() => router.back()}
          className="text-sm text-emerald-600 hover:underline flex items-center gap-1"
        >
          <ArrowLeft size={14} /> Kembali
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[1fr_320px] bg-gray-50 h-screen overflow-hidden gap-0">
      {/* Main Content Area - Independent Scroll */}
      <div className="w-full h-full overflow-y-auto overscroll-contain pb-32 min-h-0">
        <div className="px-6 pt-6 pb-24 max-w-4xl mx-auto">
          {/* ── Back + Header ── */}
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  Kelola Produk
                  <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-sm font-semibold border border-emerald-100 flex items-center gap-1.5">
                    <Package size={14} />
                    {product.namaEtalase || product.nama}
                  </span>
                </h1>
              </div>
            </div>
          </div>

          {/* ── Product Card Summary ── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5 flex items-center gap-4 shadow-sm">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center text-2xl">
              {product.gambarUrl ? (
                <div className="relative w-full h-full">
                  <Image
                    src={product.gambarUrl}
                    alt={product.nama}
                    fill
                    sizes="64px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                "📦"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 truncate">{product.nama}</p>
              <p className="text-xs text-gray-500">
                {product.category?.nama || "Tanpa Kategori"}
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span
                  className={`px-2 py-0.5 rounded-md text-xs font-bold ${statusColor(product.status)}`}
                >
                  {product.status}
                </span>
                {product.diskonPersen && product.diskonPersen > 0 && (
                  <span className="flex items-center gap-0.5 text-[11px] font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-md">
                    <Tag size={9} /> {product.diskonPersen}% OFF
                  </span>
                )}
                <span className="text-xs font-bold text-emerald-700">
                  {formatRupiah(product.harga)}
                </span>
                {product.rating !== undefined && (
                  <span className="flex items-center gap-0.5 text-xs text-gray-500">
                    <Star size={11} className="text-amber-400 fill-amber-400" />{" "}
                    {product.rating.toFixed(1)}
                  </span>
                )}
              </div>
            </div>

            {/* Toggle Status Button - Pojok Kanan */}
            <div className="flex-shrink-0">
              <button
                onClick={handleToggleStatus}
                disabled={actionLoading}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border transition-colors disabled:opacity-50 ${
                  product.status === "ACTIVE"
                    ? "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    : "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                }`}
              >
                {actionLoading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : product.status === "ACTIVE" ? (
                  <EyeOff size={15} />
                ) : (
                  <Eye size={15} />
                )}
                {product.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
              </button>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="flex items-center gap-1 mb-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab("etalase")}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all rounded-lg ${
                activeTab === "etalase"
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Store size={16} />
              Atur Etalase
            </button>
            <button
              onClick={() => setActiveTab("margin")}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all rounded-lg ${
                activeTab === "margin"
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Percent size={16} />
              Margin & Harga
            </button>

            <button
              onClick={() => setActiveTab("riwayat")}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all rounded-lg ${
                activeTab === "riwayat"
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Package size={16} />
              Riwayat Harga
            </button>
          </div>
          {/* ────────────────────────────────────────────────────────────────────── */}
          {/* TAB: ATUR ETALASE                                                    */}
          {/* ────────────────────────────────────────────────────────────────────── */}
          {activeTab === "etalase" && (
            <div className="animate-fade-in space-y-4">
              {/* Quick actions - Removed Atur Diskon */}
              <div className="flex gap-2 flex-wrap">
                {/* Button Atur Diskon dihapus */}
              </div>

              {/* Edit Form */}
              <form
                onSubmit={handleSaveEtalase}
                className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5 shadow-sm"
              >
                {editFeedback && (
                  <div
                    className={`flex items-center gap-2 p-3 rounded-xl text-sm border ${
                      editFeedback.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}
                  >
                    {editFeedback.type === "success" ? (
                      <CheckCircle2 size={15} />
                    ) : (
                      <AlertCircle size={15} />
                    )}
                    {editFeedback.msg}
                  </div>
                )}

                <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                  <Edit size={16} className="text-emerald-600" />
                  <span className="font-semibold text-gray-900 text-sm">
                    Edit Info Etalase
                  </span>
                </div>

                {/* Varian Kemasan Section */}
                {varians.length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                      <Package size={16} className="text-emerald-600" />
                      <span className="font-semibold text-gray-900 text-sm">
                        Daftar Varian Kemasan Etalase
                      </span>
                    </div>

                    <div className="grid gap-3">
                      {varians.map((varian) => (
                        <div
                          key={varian.id}
                          className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-150 hover:border-emerald-200/80 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-900 bg-white border border-gray-200 px-2 py-0.5 rounded-lg shadow-xs">
                                Kemasan {varian.ukuranKg} kg
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md ${varian.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}
                              >
                                {varian.isActive ? "Aktif" : "Nonaktif"}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>
                                Stok:{" "}
                                <strong className="text-gray-900">
                                  {varian.stokKemasan}
                                </strong>{" "}
                                unit
                              </span>
                              <span>
                                Biaya Tambahan:{" "}
                                <strong className="text-emerald-700">
                                  {formatRupiah(varian.biayaTambahan)}
                                </strong>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {editingVarianId === varian.id ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  value={editVarianPrice}
                                  onChange={(e) =>
                                    setEditVarianPrice(Number(e.target.value))
                                  }
                                  className="w-24 px-2 py-1 text-xs border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                                  placeholder="Harga"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateVarian(
                                      varian.id,
                                      editVarianPrice,
                                    )
                                  }
                                  className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                                >
                                  <Save size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingVarianId(null)}
                                  className="p-1.5 bg-white border border-gray-200 text-gray-400 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingVarianId(varian.id);
                                    setEditVarianPrice(varian.biayaTambahan);
                                  }}
                                  className="px-2.5 py-1 text-xs bg-white hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-lg transition-colors font-semibold"
                                >
                                  Ubah Biaya
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateVarian(
                                      varian.id,
                                      undefined,
                                      !varian.isActive,
                                    )
                                  }
                                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                                    varian.isActive
                                      ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                      : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                  }`}
                                >
                                  {varian.isActive ? "Nonaktifkan" : "Aktifkan"}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Harga & Stok */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Harga Default (Rp)
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium text-gray-700 flex items-center justify-between">
                        <span>Rp {editForm.harga.toLocaleString("id-ID")}</span>
                        <span className="text-[9px] bg-gray-200/60 text-gray-400 px-2 py-0.5 rounded uppercase tracking-wider font-medium">
                          Read-Only
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab("margin")}
                        className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <Edit size={14} />
                        Edit
                      </button>
                    </div>
                    <span className="text-[10px] text-gray-400 block mt-1 font-normal leading-normal">
                      Harga total per varian kemasan akan ditambah dengan Biaya
                      Tambahan di atas.
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Total Stok ({product.satuan || "kg"})
                    </label>
                    <div className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium text-gray-500 flex items-center justify-between">
                      <span>
                        {editForm.stok} {product.satuan || "kg"}
                      </span>
                      <span className="text-[9px] bg-gray-200/60 text-gray-400 px-2 py-0.5 rounded uppercase tracking-wider font-medium">
                        Read-Only
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 block mt-1 font-normal leading-normal">
                      Stok bertambah otomatis saat Pengajuan Stok disetujui.
                    </span>
                  </div>
                </div>

                {/* Deskripsi */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="deskripsiInput"
                      className="block text-xs font-semibold text-gray-600"
                    >
                      Deskripsi
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        handleSaveField("deskripsi", editForm.deskripsi)
                      }
                      disabled={savingField === "deskripsi"}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 disabled:opacity-50 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      {savingField === "deskripsi" ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Save size={12} />
                      )}
                      Simpan
                    </button>
                  </div>
                  {fieldFeedback?.field === "deskripsi" && (
                    <div
                      className={`flex items-center gap-2 p-2 rounded-lg text-xs mb-2 border ${
                        fieldFeedback.type === "success"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }`}
                    >
                      {fieldFeedback.type === "success" ? (
                        <CheckCircle2 size={13} />
                      ) : (
                        <AlertCircle size={13} />
                      )}
                      {fieldFeedback.msg}
                    </div>
                  )}
                  <textarea
                    id="deskripsiInput"
                    value={editForm.deskripsi}
                    onChange={(e) =>
                      setEditForm({ ...editForm, deskripsi: e.target.value })
                    }
                    rows={3}
                    placeholder="Deskripsi produk untuk pembeli..."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                  />
                </div>

                {/* Foto Produk */}
                <div className="space-y-3 pt-1 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-600">
                      Foto Produk (Maks 3)
                    </span>
                    <div className="flex items-center gap-2">
                      {editForm.images.length < 3 && (
                        <button
                          type="button"
                          onClick={() =>
                            setEditForm((prev) => ({
                              ...prev,
                              images: [
                                ...prev.images,
                                { type: "link", value: "" },
                              ],
                            }))
                          }
                          className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg"
                        >
                          <Plus size={12} /> Tambah Foto
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          handleSaveField("images", editForm.images)
                        }
                        disabled={savingField === "images"}
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700 disabled:opacity-50 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        {savingField === "images" ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Save size={12} />
                        )}
                        Simpan
                      </button>
                    </div>
                  </div>
                  {fieldFeedback?.field === "images" && (
                    <div
                      className={`flex items-center gap-2 p-2 rounded-lg text-xs border ${
                        fieldFeedback.type === "success"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }`}
                    >
                      {fieldFeedback.type === "success" ? (
                        <CheckCircle2 size={13} />
                      ) : (
                        <AlertCircle size={13} />
                      )}
                      {fieldFeedback.msg}
                    </div>
                  )}
                  {editForm.images.map((img, idx) => (
                    <div
                      key={idx}
                      className="flex gap-2 items-start bg-gray-50 p-3 rounded-xl border border-gray-100 relative"
                    >
                      {editForm.images.length > 1 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setEditForm((prev) => ({
                              ...prev,
                              images: prev.images.filter((_, i) => i !== idx),
                            }))
                          }
                          className="absolute -top-2 -right-2 bg-white text-red-500 rounded-full p-1 shadow-sm border border-gray-100 hover:bg-red-50 z-10"
                        >
                          <X size={12} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setEditForm((prev) => ({
                              ...prev,
                              images: [{ type: "link", value: "" }],
                            }))
                          }
                          className="absolute -top-2 -right-2 bg-white text-red-500 rounded-full p-1 shadow-sm border border-gray-100 hover:bg-red-50 z-10"
                        >
                          <X size={12} />
                        </button>
                      )}
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setEditForm((prev) => ({
                                ...prev,
                                images: prev.images.map((im, i) =>
                                  i === idx ? { type: "link", value: "" } : im,
                                ),
                              }))
                            }
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${img.type === "link" ? "bg-emerald-600 text-white" : "bg-white text-gray-500 border border-gray-200"}`}
                          >
                            Link URL
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setEditForm((prev) => ({
                                ...prev,
                                images: prev.images.map((im, i) =>
                                  i === idx ? { type: "file", value: "" } : im,
                                ),
                              }))
                            }
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${img.type === "file" ? "bg-emerald-600 text-white" : "bg-white text-gray-500 border border-gray-200"}`}
                          >
                            Upload File
                          </button>
                        </div>
                        {img.type === "link" ? (
                          <div className="space-y-2">
                            <input
                              type="url"
                              value={img.value}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditForm((prev) => ({
                                  ...prev,
                                  images: prev.images.map((im, i) =>
                                    i === idx ? { ...im, value: val } : im,
                                  ),
                                }));
                              }}
                              placeholder="https://example.com/image.png"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                            {img.value && (
                              <div className="mt-2 relative inline-block">
                                <Image
                                  src={img.value}
                                  alt="Preview"
                                  width={100}
                                  height={100}
                                  className="w-24 h-24 object-cover rounded-md border border-gray-200"
                                  unoptimized
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                                <div className="flex gap-2 mt-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        images: prev.images.map((im, i) =>
                                          i === idx ? { ...im, value: "" } : im,
                                        ),
                                      }))
                                    }
                                    className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded hover:bg-emerald-100 font-semibold"
                                  >
                                    Ganti URL
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        images:
                                          prev.images.length > 1
                                            ? prev.images.filter(
                                                (_, i) => i !== idx,
                                              )
                                            : [{ type: "link", value: "" }],
                                      }))
                                    }
                                    className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded hover:bg-red-100 font-semibold"
                                  >
                                    Hapus Foto
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            {img.value ? (
                              <div className="space-y-2">
                                <Image
                                  src={img.value}
                                  alt="Preview"
                                  width={100}
                                  height={100}
                                  className="w-24 h-24 object-cover rounded-md border border-gray-200"
                                  unoptimized
                                />
                                <div className="flex gap-2 items-center">
                                  <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded">
                                    ✔️ File Terpilih
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        images: prev.images.map((im, i) =>
                                          i === idx ? { ...im, value: "" } : im,
                                        ),
                                      }))
                                    }
                                    className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded hover:bg-emerald-100 font-semibold"
                                  >
                                    Ganti File
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        images:
                                          prev.images.length > 1
                                            ? prev.images.filter(
                                                (_, i) => i !== idx,
                                              )
                                            : [{ type: "link", value: "" }],
                                      }))
                                    }
                                    className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded hover:bg-red-100 font-semibold"
                                  >
                                    Hapus Foto
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    // Validasi maksimal 2 MB
                                    if (file.size > 2 * 1024 * 1024) {
                                      alert(
                                        `Ukuran file ${file.name} terlalu besar! Maksimal 2 MB per foto.`,
                                      );
                                      setFieldFeedback({
                                        field: "images",
                                        type: "error",
                                        msg: `Ukuran file ${file.name} terlalu besar! Maksimal 2 MB per foto.`,
                                      });
                                      e.target.value = "";
                                      return;
                                    }
                                    setFieldFeedback(null);

                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      const val = reader.result as string;
                                      setEditForm((prev) => ({
                                        ...prev,
                                        images: prev.images.map((im, i) =>
                                          i === idx
                                            ? { ...im, value: val }
                                            : im,
                                        ),
                                      }));
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 w-full"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Submit */}
                <div className="flex gap-3 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-sm"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="flex-[2] py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2 text-sm shadow-md shadow-emerald-200"
                  >
                    {editLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────────── */}
          {/* TAB: MARGIN & HARGA                                                  */}
          {/* ────────────────────────────────────────────────────────────────────── */}
          {activeTab === "margin" && (
            <div className="animate-fade-in space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5 shadow-sm">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                  <Percent size={16} className="text-emerald-600" />
                  <span className="font-semibold text-gray-900 text-sm">
                    Atur Margin & Harga Jual
                  </span>
                </div>

                {marginFeedback && (
                  <div
                    className={`flex items-center gap-2 p-3 rounded-xl text-sm border ${
                      marginFeedback.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}
                  >
                    {marginFeedback.type === "success" ? (
                      <CheckCircle2 size={15} />
                    ) : (
                      <AlertCircle size={15} />
                    )}
                    {marginFeedback.msg}
                  </div>
                )}

                <div className="bg-emerald-50/40 border border-emerald-100/60 rounded-xl p-4 flex items-start gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg flex-shrink-0">
                    <Percent size={16} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-emerald-900 uppercase tracking-wider">
                      Informasi Harga Pokok
                    </h4>
                    <p className="text-xs text-emerald-700 leading-relaxed font-medium">
                      Produk ini dibeli dari gudang dengan harga pokok{" "}
                      <span className="font-bold bg-emerald-200/50 px-2 py-0.5 rounded">
                        Rp {product.harga.toLocaleString("id-ID")}
                      </span>
                      . Atur margin keuntungan atau harga jual custom di bawah.
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!product) return;

                    setMarginLoading(true);
                    setMarginFeedback(null);
                    try {
                      const payload: any = {};
                      if (useCustomMargin) {
                        payload.marginPersen = Number(marginInput);
                      } else {
                        payload.hargaJual = Number(priceInput);
                      }

                      await apiClient.patch(
                        `/toko/harga/produk/${product.id}`,
                        payload,
                      );
                      setMarginFeedback({
                        type: "success",
                        msg: "Harga jual berhasil disimpan!",
                      });

                      // Reload product data
                      const res = await productsApi.getById(id);
                      const data = res?.data?.data || res?.data;
                      setProduct(data);
                    } catch (err: unknown) {
                      const e = err as {
                        response?: { data?: { message?: string } };
                        message?: string;
                      };
                      setMarginFeedback({
                        type: "error",
                        msg:
                          e?.response?.data?.message ||
                          e?.message ||
                          "Gagal menyimpan harga jual.",
                      });
                    } finally {
                      setMarginLoading(false);
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="flex gap-2 p-1 bg-gray-50 border border-gray-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setUseCustomMargin(true)}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                        useCustomMargin
                          ? "bg-white text-emerald-600 shadow-sm border border-gray-100"
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      <Percent size={14} className="inline mr-1" />
                      Override Margin (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseCustomMargin(false)}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                        !useCustomMargin
                          ? "bg-white text-emerald-600 shadow-sm border border-gray-100"
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      <Tag size={14} className="inline mr-1" />
                      Custom Harga Jual (Rp)
                    </button>
                  </div>

                  {useCustomMargin ? (
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-gray-600">
                        Margin Profit (%)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="200"
                          value={marginInput}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setMarginInput(val);
                            setPriceInput(product.harga * (1 + val / 100));
                          }}
                          className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                        <span className="text-sm font-medium text-gray-500">
                          %
                        </span>
                      </div>
                      <p className="text-xs text-emerald-600 font-medium">
                        Preview Harga Jual: Rp{" "}
                        {priceInput.toLocaleString("id-ID")}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-gray-600">
                        Harga Jual Baru (Rp)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-sm text-gray-400 font-medium">
                          Rp
                        </span>
                        <input
                          type="number"
                          min={product.harga}
                          value={priceInput}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setPriceInput(val);
                            if (product.harga > 0) {
                              setMarginInput(
                                ((val - product.harga) / product.harga) * 100,
                              );
                            }
                          }}
                          className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                      <p className="text-xs text-amber-600 font-medium">
                        Preview Margin: {marginInput.toFixed(1)}%
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        setUseCustomMargin(false);
                        setMarginInput(15);
                        setPriceInput(product.harga * 1.15);
                      }}
                      className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-sm"
                    >
                      Reset
                    </button>
                    <button
                      type="submit"
                      disabled={marginLoading}
                      className="flex-[2] py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2 text-sm shadow-md shadow-emerald-200"
                    >
                      {marginLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                      Simpan Harga Jual
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────────── */}
          {/* TAB: RIWAYAT HARGA                                                   */}
          {/* ────────────────────────────────────────────────────────────────────── */}
          {activeTab === "review" && (
            <div className="animate-fade-in space-y-3">
              {reviewsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-7 h-7 text-emerald-600 animate-spin" />
                </div>
              ) : reviews.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="font-semibold text-gray-700">
                    Belum Ada Review
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Produk ini belum mendapat ulasan dari pembeli.
                  </p>
                </div>
              ) : (
                <>
                  {/* Summary bar */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-3xl font-black text-gray-900">
                        {(
                          reviews.reduce((sum, r) => sum + r.rating, 0) /
                          reviews.length
                        ).toFixed(1)}
                      </p>
                      <StarRating
                        rating={Math.round(
                          reviews.reduce((sum, r) => sum + r.rating, 0) /
                            reviews.length,
                        )}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {reviews.length} ulasan
                      </p>
                    </div>
                    <div className="flex-1 space-y-1">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = reviews.filter(
                          (r) => r.rating === star,
                        ).length;
                        const pct = reviews.length
                          ? (count / reviews.length) * 100
                          : 0;
                        return (
                          <div key={star} className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-3">
                              {star}
                            </span>
                            <Star
                              size={10}
                              className="text-amber-400 fill-amber-400"
                            />
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-400 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-400 w-5 text-right">
                              {count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Review list */}
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className={`bg-white rounded-2xl border p-4 shadow-sm transition-all ${
                        review.isHidden
                          ? "border-red-200 opacity-60"
                          : "border-gray-100"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">
                            {review.user?.name || "Anonim"}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <StarRating rating={review.rating} />
                            <span className="text-xs text-gray-400">
                              {new Date(review.createdAt).toLocaleDateString(
                                "id-ID",
                                {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                },
                              )}
                            </span>
                          </div>
                        </div>
                        {reviewStatusBadge(review)}
                      </div>

                      {review.ulasan && (
                        <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                          {review.ulasan}
                        </p>
                      )}

                      {/* Laporan info */}
                      {review.reportStatus === "REPORTED" &&
                        review.reportReason && (
                          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                            <p className="font-semibold mb-0.5 flex items-center gap-1">
                              <ShieldAlert size={11} /> Laporan Anda (menunggu
                              review admin)
                            </p>
                            <p className="text-amber-700">
                              {review.reportReason}
                            </p>
                          </div>
                        )}

                      {review.reportStatus === "TAKEDOWN_REJECTED" && (
                        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
                          <p className="font-semibold flex items-center gap-1">
                            <ShieldCheck size={11} /> Admin menolak permintaan
                            takedown — review tetap tampil.
                          </p>
                        </div>
                      )}

                      {/* Tombol Laporkan */}
                      {!review.isHidden &&
                        review.reportStatus !== "REPORTED" &&
                        review.reportStatus !== "TAKEDOWN_APPROVED" && (
                          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                            <button
                              onClick={() => {
                                setReportModal(review);
                                setReportAlasan("");
                                setReportFeedback(null);
                              }}
                              className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              <Flag size={12} /> Laporkan ke Admin
                            </button>
                          </div>
                        )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* ── Modal Laporkan Review ── */}
          {reportModal && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
              <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden">
                <div className="px-5 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center">
                      <Flag size={16} className="text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">
                        Laporkan Review
                      </h3>
                      <p className="text-xs text-gray-500">
                        Minta admin untuk menghapus review ini
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setReportModal(null);
                      setReportAlasan("");
                      setReportFeedback(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  {/* Review preview */}
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <StarRating rating={reportModal.rating} />
                      <span className="text-xs text-gray-500">
                        {reportModal.user?.name || "Anonim"}
                      </span>
                    </div>
                    {reportModal.ulasan && (
                      <p className="text-xs text-gray-700 line-clamp-2">
                        {reportModal.ulasan}
                      </p>
                    )}
                  </div>

                  {/* Alasan */}
                  <div>
                    <label
                      htmlFor="alasanInput"
                      className="block text-xs font-semibold text-gray-700 mb-1.5"
                    >
                      Alasan Laporan <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="alasanInput"
                      value={reportAlasan}
                      onChange={(e) => {
                        setReportAlasan(e.target.value);
                        setReportFeedback(null);
                      }}
                      rows={3}
                      placeholder="Jelaskan mengapa review ini perlu dihapus (min. 10 karakter)..."
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {reportAlasan.trim().length} / minimal 10 karakter
                    </p>
                  </div>

                  {reportFeedback && (
                    <div
                      className={`flex items-center gap-2 p-3 rounded-xl text-sm border ${
                        reportFeedback.type === "success"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }`}
                    >
                      {reportFeedback.type === "success" ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <AlertCircle size={14} />
                      )}
                      {reportFeedback.msg}
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => {
                        setReportModal(null);
                        setReportAlasan("");
                        setReportFeedback(null);
                      }}
                      className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-sm"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleReport}
                      disabled={reportLoading}
                      className="flex-[2] py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2 text-sm"
                    >
                      {reportLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Flag size={16} />
                      )}
                      Kirim Laporan
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Fixed Height, Independent Scroll */}
      <div className="hidden lg:flex w-80 border-l border-gray-100 bg-white h-full flex-col flex-shrink-0 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-sm font-semibold text-gray-900">
            Produk Lainnya
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 p-6">
          <ProductListSidebar currentProductId={product.id} />
        </div>
      </div>
    </div>
  );
}
