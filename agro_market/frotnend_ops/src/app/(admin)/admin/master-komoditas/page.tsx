"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Wheat,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FilterX,
} from "lucide-react";

import { gudangApi } from "@/lib/ecommerce-api";
import PageHeader from "@/components/ui/PageHeader";

// ─── Types ───────────────────────────────────────────────────────────────────
interface MasterKomoditas {
  id: string;
  nama: string;
  kategori: string;
  satuan: string;
  harga: number;
  deskripsi?: string;
  gambarUrl?: string;
  isActive?: boolean;
  _count?: { produkGudang: number };
}

function formatRupiah(val: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MasterKomoditasPage() {
  const [list, setList] = useState<MasterKomoditas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterKat, setFilterKat] = useState("semua");
  const [filterStatus, setFilterStatus] = useState<
    "semua" | "aktif" | "nonaktif"
  >("semua");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await gudangApi.getMasterKomoditas();
      // TransformInterceptor wraps: { success, data: { statusCode, data: [...] } }
      const raw = res.data?.data?.data ?? res.data?.data ?? res.data ?? [];
      setList(Array.isArray(raw) ? raw : []);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          err?.message ??
          "Gagal memuat data komoditas.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const categories = Array.from(
    new Set(list.map((k) => k.kategori).filter(Boolean)),
  );

  const filtered = list.filter((k) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      k.nama.toLowerCase().includes(q) ||
      k.kategori?.toLowerCase().includes(q) ||
      k.deskripsi?.toLowerCase().includes(q);
    const matchKat = filterKat === "semua" || k.kategori === filterKat;
    const matchStatus =
      filterStatus === "aktif"
        ? k.isActive === true
        : filterStatus === "nonaktif"
          ? k.isActive === false
          : true;
    return matchSearch && matchKat && matchStatus;
  });

  const isFiltered =
    search || filterKat !== "semua" || filterStatus !== "semua";

  const clearFilters = () => {
    setSearch("");
    setFilterKat("semua");
    setFilterStatus("semua");
  };

  return (
    <div className="p-4 lg:p-8 max-w-[1400px] mx-auto min-h-screen bg-gray-50/30">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <PageHeader
        title="Komoditas"
        description={`${list.length} komoditas dari Gudang service · read-only`}
        icon={Wheat}
        iconColor="text-amber-500"
        actions={
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-2xl text-sm hover:bg-gray-50 active:scale-95 transition-all shadow-sm disabled:opacity-40"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        }
      />

      {/* ── Stats row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          {
            label: "Total",
            value: list.length,
            color: "text-gray-700",
            bg: "bg-white",
          },
          {
            label: "Aktif",
            value: list.filter((k) => k.isActive).length,
            color: "text-emerald-600",
            bg: "bg-white",
          },
          {
            label: "Nonaktif",
            value: list.filter((k) => !k.isActive).length,
            color: "text-rose-500",
            bg: "bg-white",
          },
          {
            label: "Kategori",
            value: categories.length,
            color: "text-indigo-500",
            bg: "bg-white",
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`${s.bg} border border-gray-100 rounded-2xl px-5 py-4 shadow-sm`}
          >
            <p className="text-xs text-gray-400 uppercase tracking-wider">
              {s.label}
            </p>
            <p className={`text-2xl font-semibold mt-1 ${s.color}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-3 items-start text-sm text-red-600">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm mb-4 flex flex-col sm:flex-row gap-3">
        {/* search */}
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, kategori, deskripsi…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-amber-400/50 outline-none transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <FilterX size={14} />
            </button>
          )}
        </div>

        {/* kategori */}
        <select
          value={filterKat}
          onChange={(e) => setFilterKat(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white focus:ring-2 focus:ring-amber-400/50 outline-none"
        >
          <option value="semua">Semua Kategori</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* status tabs */}
        <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm shrink-0">
          {(["semua", "aktif", "nonaktif"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-4 py-2.5 capitalize transition-colors ${
                filterStatus === s
                  ? "bg-amber-500 text-white"
                  : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Result count ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-xs text-gray-400">
          {loading
            ? "Memuat…"
            : `${filtered.length} dari ${list.length} komoditas`}
        </p>
        {isFiltered && !loading && (
          <button
            onClick={clearFilters}
            className="text-xs text-amber-600 hover:underline flex items-center gap-1"
          >
            <FilterX size={12} /> Reset filter
          </button>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 size={28} className="animate-spin text-amber-400" />
            <p className="text-sm text-gray-400">Mengambil data dari Gudang…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Wheat size={36} className="text-gray-200" />
            <p className="text-sm text-gray-400">
              Tidak ada komoditas ditemukan
            </p>
            {isFiltered && (
              <button
                onClick={clearFilters}
                className="text-xs text-amber-600 hover:underline"
              >
                Reset filter
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                  <th className="px-5 py-3.5 text-left w-10 font-medium">#</th>
                  <th className="px-5 py-3.5 text-left font-medium">
                    Komoditas
                  </th>
                  <th className="px-5 py-3.5 text-left font-medium">
                    Kategori
                  </th>
                  <th className="px-5 py-3.5 text-left font-medium">Satuan</th>
                  <th className="px-5 py-3.5 text-right font-medium">
                    Harga Dasar
                  </th>
                  <th className="px-5 py-3.5 text-center font-medium">
                    Produk
                  </th>
                  <th className="px-5 py-3.5 text-center font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((k, i) => (
                  <tr
                    key={k.id}
                    className="border-b border-gray-50 hover:bg-amber-50/20 transition-colors"
                  >
                    {/* no */}
                    <td className="px-5 py-3.5 text-gray-300 text-xs">
                      {i + 1}
                    </td>

                    {/* nama */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0 overflow-hidden">
                          {k.gambarUrl ? (
                            <Image
                              src={k.gambarUrl}
                              alt={k.nama}
                              width={36}
                              height={36}
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <Wheat size={15} className="text-amber-300" />
                          )}
                        </div>
                        <div>
                          <p className="text-gray-800 font-medium">{k.nama}</p>
                          {k.deskripsi && (
                            <p className="text-xs text-gray-400 line-clamp-1 max-w-[260px]">
                              {k.deskripsi}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* kategori */}
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs">
                        {k.kategori || "—"}
                      </span>
                    </td>

                    {/* satuan */}
                    <td className="px-5 py-3.5 text-gray-500 text-xs">
                      {k.satuan}
                    </td>

                    {/* harga */}
                    <td className="px-5 py-3.5 text-right text-gray-700 font-medium text-xs">
                      {k.harga ? (
                        formatRupiah(k.harga)
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>

                    {/* produk */}
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs ${
                          (k._count?.produkGudang ?? 0) > 0
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-gray-50 text-gray-400"
                        }`}
                      >
                        {k._count?.produkGudang ?? 0}
                      </span>
                    </td>

                    {/* status */}
                    <td className="px-5 py-3.5 text-center">
                      {k.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs">
                          <CheckCircle2 size={10} /> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 text-gray-400 rounded-full text-xs">
                          <XCircle size={10} /> Nonaktif
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Footer note ────────────────────────────────────────────────────── */}
      <p className="mt-4 text-xs text-gray-400 text-center">
        Data dikelola di aplikasi Gudang ·{" "}
        <code className="bg-gray-100 px-1 rounded">localhost:5173</code>
      </p>
    </div>
  );
}
