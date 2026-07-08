"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Star,
  MessageSquare,
  Search,
  Filter,
  ShieldAlert,
  Loader2,
  AlertCircle,
  User,
  Calendar,
  ShoppingBag,
  Trash2,
  CheckCircle,
  EyeOff,
  AlertTriangle,
  X,
} from "lucide-react";
import Image from "next/image";

import { reviewsApi } from "@/lib/ecommerce-api";

interface ReviewItem {
  id: string;
  rating: number;
  ulasan: string | null;
  fotoUrl: string | null;
  isHidden: boolean;
  createdAt: string;
  statusLaporan: string | null;
  alasanLaporan: string | null;
  dilaporkanPada: string | null;
  pengguna: {
    id: string;
    nama: string;
  };
  produk: {
    id: string;
    nama: string;
    gambarUrl: string | null;
  };
}

export default function AdminRatingPage() {
  // Data State
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filtering States
  const [searchText, setSearchText] = useState("");
  const [showOnlyReported, setShowOnlyReported] = useState(false);
  const [starFilter, setStarFilter] = useState<number | "all">("all");

  // Takedown Confirmation Modal State
  const [confirmingTakedownId, setConfirmingTakedownId] = useState<
    string | null
  >(null);
  const [takedownLoading, setTakedownLoading] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Derived: safely compute reported count from confirmed array
  const reportedCount = useMemo(() => {
    if (!Array.isArray(reviews)) return 0;
    return reviews.filter((r) => r.statusLaporan === "REPORTED").length;
  }, [reviews]);

  // Fetch reviews function
  const fetchReviews = async (
    currentPage = 1,
    search = "",
    star = starFilter,
    reportedOnly = showOnlyReported,
  ) => {
    try {
      setLoading(true);
      setError(null);

      let res;
      if (reportedOnly) {
        // Fetch flagged/reported reviews using adminGetReported
        res = await reviewsApi.adminGetReported({
          page: currentPage,
          limit: 20,
        });
      } else {
        // Fetch all reviews using adminGetAllReviews (newly added usecase)
        res = await reviewsApi.adminGetAllReviews({
          page: currentPage,
          limit: 20,
          search: search || undefined,
        });
      }

      // Ensure fetched result is always an array
      const rawData = res?.data?.data || res?.data || [];
      const fetchedReviews: ReviewItem[] = Array.isArray(rawData)
        ? rawData
        : [];
      setReviews(fetchedReviews);
      setTotalItems(res?.data?.total ?? fetchedReviews.length);
      setTotalPages(res?.data?.totalPages ?? 1);
    } catch (err: any) {
      console.error("Error fetching admin reviews:", err);
      setError(err.message || "Gagal mengambil data ulasan untuk admin.");
    } finally {
      setLoading(false);
    }
  };

  // Reload on filter toggle
  useEffect(() => {
    fetchReviews(1, searchText, starFilter, showOnlyReported);
    setPage(1);
  }, [showOnlyReported, starFilter]);

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReviews(1, searchText, starFilter, showOnlyReported);
    setPage(1);
  };

  // Clear all filters
  const handleResetFilters = () => {
    setSearchText("");
    setStarFilter("all");
    setShowOnlyReported(false);
    fetchReviews(1, "", "all", false);
    setPage(1);
  };

  // Trigger Takedown Execution
  const handleTakedownConfirm = async () => {
    if (!confirmingTakedownId) return;
    setTakedownLoading(true);
    try {
      await reviewsApi.adminTakedown(confirmingTakedownId);

      // Update review status locally to show Takedown Badge immediately
      setReviews((prev) =>
        prev.map((r) => {
          if (r.id === confirmingTakedownId) {
            return {
              ...r,
              isHidden: true,
              statusLaporan: "TAKEDOWN_APPROVED",
            };
          }
          return r;
        }),
      );

      setConfirmingTakedownId(null);
    } catch (err: any) {
      console.error("Takedown error:", err);
      alert(err.message || "Gagal men-takedown ulasan.");
    } finally {
      setTakedownLoading(false);
    }
  };

  // Render elegant stars
  const renderStars = (rating: number, size = 16) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          size={size}
          className={
            i <= rating
              ? "text-amber-400 fill-amber-400"
              : "text-gray-200 fill-gray-200"
          }
        />,
      );
    }
    return <div className="flex gap-0.5">{stars}</div>;
  };

  return (
    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-in font-sans">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-gray-100">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <ShieldAlert className="text-[#10B981]" size={28} /> Audit Ulasan &
            Rating
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Auditing feedback dari konsumen, monitoring ulasan bermasalah, dan
            lakukan moderasi/takedown jika melanggar kebijakan.
          </p>
        </div>

        {/* Global Stats Banner */}
        <div className="flex items-center gap-6 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="text-center border-r border-gray-100 pr-5">
            <span className="block text-2xl font-black text-gray-900">
              {totalItems}
            </span>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              Total Ulasan
            </span>
          </div>
          <div className="text-center">
            <span className="block text-2xl font-black text-rose-600">
              {reportedCount}+
            </span>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              Laporan Masuk
            </span>
          </div>
        </div>
      </div>

      {/* Audit Tool-Bar */}
      <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4">
        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-col md:flex-row gap-4 items-center justify-between"
        >
          {/* Real-time search */}
          <div className="relative group w-full md:max-w-md">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors"
            />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Cari ulasan, produk, atau pembeli..."
              className="w-full pl-11 pr-4 py-3 bg-gray-50/50 focus:bg-white border border-gray-100 focus:border-emerald-500 rounded-2xl text-xs focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all"
            />
          </div>

          {/* Filter options */}
          <div className="flex flex-wrap gap-3 items-center w-full md:w-auto justify-end">
            {/* Flags/Reports only toggle */}
            <button
              type="button"
              onClick={() => setShowOnlyReported(!showOnlyReported)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all flex items-center gap-2 ${
                showOnlyReported
                  ? "bg-rose-50 border-rose-100 text-rose-700 shadow-sm"
                  : "bg-white border-gray-100 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <AlertTriangle
                size={14}
                className={
                  showOnlyReported
                    ? "text-rose-600 animate-pulse"
                    : "text-gray-400"
                }
              />
              Hanya Ulasan Dilaporkan
            </button>

            {/* Star selector */}
            {!showOnlyReported && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Bintang:
                </span>
                <select
                  value={starFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStarFilter(val === "all" ? "all" : Number(val));
                  }}
                  className="bg-white border border-gray-100 rounded-2xl px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none"
                >
                  <option value="all">Semua Bintang</option>
                  <option value="5">5 Bintang</option>
                  <option value="4">4 Bintang</option>
                  <option value="3">3 Bintang</option>
                  <option value="2">2 Bintang</option>
                  <option value="1">1 Bintang</option>
                </select>
              </div>
            )}

            {/* Clear Button */}
            {(searchText || starFilter !== "all" || showOnlyReported) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 transition-all"
              >
                Reset Filter
              </button>
            )}
          </div>
        </form>
      </div>

      {/* REVIEWS GRID STREAM */}
      {loading ? (
        <div className="flex flex-col justify-center items-center py-20 gap-3">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
          <p className="text-gray-400 font-medium">Memuat data audit...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-8 rounded-3xl border border-red-100 flex items-center gap-4 max-w-2xl mx-auto">
          <AlertCircle size={32} />
          <div>
            <h3 className="font-bold text-lg">Error Auditing</h3>
            <p className="text-sm opacity-90">{error}</p>
          </div>
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-3xl p-24 text-center border border-gray-100 shadow-sm space-y-4">
          <MessageSquare className="w-16 h-16 text-gray-100 mx-auto" />
          <h3 className="text-gray-900 font-bold text-lg">
            Tidak Ada Ulasan Ditemukan
          </h3>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">
            Seluruh ulasan aman atau tidak ada data yang memenuhi kriteria
            pencarian Anda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reviews.map((review) => (
            <div
              key={review.id}
              className={`bg-white border rounded-3xl p-6 shadow-sm flex flex-col justify-between transition-all relative ${
                review.isHidden
                  ? "border-red-100/80 bg-red-50/[0.01]"
                  : review.statusLaporan === "REPORTED"
                    ? "border-amber-100 shadow-md shadow-amber-500/[0.01]"
                    : "border-gray-50 hover:border-gray-100"
              }`}
            >
              {/* Flagged Banner */}
              {review.statusLaporan === "REPORTED" && !review.isHidden && (
                <div className="absolute top-0 inset-x-0 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-black uppercase tracking-widest text-center py-1.5 rounded-t-[22px] flex items-center justify-center gap-1.5 shadow-sm">
                  <AlertTriangle size={11} className="animate-bounce" /> Review
                  Dilaporkan Oleh Seller
                </div>
              )}

              {/* Takedown Approved Banner */}
              {review.isHidden && (
                <div className="absolute top-0 inset-x-0 bg-gradient-to-r from-red-600 to-rose-700 text-white text-[10px] font-black uppercase tracking-widest text-center py-1.5 rounded-t-[22px] flex items-center justify-center gap-1.5 shadow-sm">
                  <EyeOff size={11} /> Ulasan Telah Ditakedown (Hidden)
                </div>
              )}

              {/* Space for banner if active */}
              <div
                className={
                  review.statusLaporan === "REPORTED" || review.isHidden
                    ? "pt-4"
                    : ""
                }
              />

              {/* Reviewer Details and Stars */}
              <div className="space-y-4 flex-1">
                <div className="flex justify-between items-start pt-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-50 text-gray-600 flex items-center justify-center border border-gray-100 shadow-inner">
                      <User size={16} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-gray-900 text-sm">
                        {review.pengguna.nama}
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                        <Calendar size={11} />
                        <span>
                          {new Date(review.createdAt).toLocaleDateString(
                            "id-ID",
                            { day: "numeric", month: "long", year: "numeric" },
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {renderStars(review.rating, 11)}
                    <span className="text-[10px] font-bold text-gray-400">
                      Rating: {review.rating}
                    </span>
                  </div>
                </div>

                {/* Review Text */}
                {review.ulasan ? (
                  <p className="text-gray-700 text-xs leading-relaxed font-medium bg-gray-50 p-3 rounded-2xl border border-gray-100/50">
                    &ldquo;{review.ulasan}&rdquo;
                  </p>
                ) : (
                  <p className="text-gray-400 text-[11px] italic pl-1">
                    Konsumen tidak memberikan komentar tertulis.
                  </p>
                )}

                {/* Flag Reason Panel */}
                {review.statusLaporan === "REPORTED" &&
                  review.alasanLaporan && (
                    <div className="bg-amber-50/70 border border-amber-100 p-3 rounded-2xl space-y-1">
                      <span className="text-[9px] uppercase font-bold text-amber-700 tracking-wider block">
                        Alasan Laporan Seller:
                      </span>
                      <p className="text-[11px] text-amber-800 leading-normal italic font-medium">
                        &ldquo;{review.alasanLaporan}&rdquo;
                      </p>
                    </div>
                  )}
              </div>

              {/* Product and Action buttons */}
              <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between gap-4">
                {/* Product Widget */}
                <div className="flex items-center gap-2.5 max-w-[60%]">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-gray-100 bg-gray-50 flex-shrink-0">
                    {review.produk.gambarUrl ? (
                      <Image
                        src={review.produk.gambarUrl}
                        alt={review.produk.nama}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <ShoppingBag size={12} />
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                      Produk
                    </span>
                    <span className="font-bold text-gray-800 text-[11px] line-clamp-1">
                      {review.produk.nama}
                    </span>
                  </div>
                </div>

                {/* Moderate Action */}
                <div className="flex gap-2">
                  {review.isHidden ? (
                    <span className="px-3 py-1.5 rounded-xl bg-red-50 text-red-600 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle size={10} /> Sukses Takedown
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmingTakedownId(review.id)}
                      className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                      <Trash2 size={13} /> Takedown
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!showOnlyReported && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            onClick={() => {
              const prev = Math.max(1, page - 1);
              setPage(prev);
              fetchReviews(prev, searchText);
            }}
            disabled={page === 1}
            className="px-4 py-2 rounded-xl border border-gray-100 text-xs font-bold text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            Sebelumnya
          </button>
          <span className="text-xs text-gray-400 font-medium px-2">
            Halaman <span className="font-bold text-gray-800">{page}</span> dari{" "}
            <span className="font-bold text-gray-800">{totalPages}</span>
          </span>
          <button
            onClick={() => {
              const next = Math.min(totalPages, page + 1);
              setPage(next);
              fetchReviews(next, searchText);
            }}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-xl border border-gray-100 text-xs font-bold text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            Selanjutnya
          </button>
        </div>
      )}

      {/* Takedown Confirmation Modal */}
      {confirmingTakedownId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 lg:p-8 max-w-md w-full shadow-2xl border border-gray-50 space-y-6 animate-scale-up">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center">
                <AlertTriangle size={24} className="text-rose-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 text-lg">
                  Konfirmasi Takedown
                </h3>
                <p className="text-xs text-gray-400">Moderasi Ulasan Pembeli</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              Apakah Anda yakin ingin men-takedown ulasan ini? Setelah
              ditakedown, ulasan ini akan **disembunyikan sepenuhnya** dari
              pelanggan pada aplikasi katalog E-commerce.
            </p>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setConfirmingTakedownId(null)}
                disabled={takedownLoading}
                className="px-5 py-2.5 rounded-2xl border border-gray-200 hover:bg-gray-50 text-xs font-bold text-gray-600 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleTakedownConfirm}
                disabled={takedownLoading}
                className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/10 flex items-center gap-1.5"
              >
                {takedownLoading ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Menghapus...
                  </>
                ) : (
                  <span>Takedown Sekarang</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
