"use client";

import { useState } from "react";
import { Loader2, Eye, ChevronLeft, ChevronRight } from "lucide-react";

import { ProfitTransaction, Pagination } from "@/types/profit-report";

import { BatchDetailsModal } from "./BatchDetailsModal";

interface ProfitTransactionsTableProps {
  transactions: ProfitTransaction[];
  pagination: Pagination;
  loading?: boolean;
  onPageChange?: (page: number, pageSize: number) => void;
}

const STATUS_COLOR: Record<string, string> = {
  MENUNGGU_KONFIRMASI_SELLER: "bg-amber-100 text-amber-700",
  MENUNGGU_BAYAR: "bg-amber-100 text-amber-700",
  DIPROSES: "bg-blue-100 text-blue-700",
  DIKIRIM: "bg-cyan-100 text-cyan-700",
  SELESAI: "bg-emerald-100 text-emerald-700",
  DIBATALKAN: "bg-red-100 text-red-600",
};

const STATUS_LABEL: Record<string, string> = {
  MENUNGGU_KONFIRMASI_SELLER: "Menunggu",
  MENUNGGU_BAYAR: "Menunggu Bayar",
  DIPROSES: "Diproses",
  DIKIRIM: "Dikirim",
  SELESAI: "Selesai",
  DIBATALKAN: "Dibatalkan",
};

function fmt(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ProfitTransactionsTable({
  transactions,
  pagination,
  loading,
  onPageChange,
}: ProfitTransactionsTableProps) {
  const [selected, setSelected] = useState<ProfitTransaction | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-emerald-500" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-sm font-medium">Tidak ada data transaksi</p>
        <p className="text-xs mt-1">Coba ubah filter tanggal atau status</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider">
              {[
                "Tanggal",
                "No. Pesanan",
                "Qty (kg)",
                "Harga Beli",
                "Harga Jual",
                "Keuntungan",
                "Margin",
                "Status",
                "",
              ].map((h) => (
                <th
                  key={h}
                  className={`py-3 px-4 font-medium text-left ${["Qty (kg)", "Harga Beli", "Harga Jual", "Keuntungan", "Margin"].includes(h) ? "text-right" : ""}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="py-3 px-4 text-gray-600">
                  {fmtDate(tx.tanggalTransaksi)}
                </td>
                <td className="py-3 px-4 font-mono text-blue-600">
                  #{tx.nomorPesanan.substring(0, 8)}
                </td>
                <td className="py-3 px-4 text-right text-gray-700">
                  {tx.jumlahTerjual.toFixed(2)}
                </td>
                <td className="py-3 px-4 text-right text-gray-600">
                  {fmt(tx.hargaBeli)}
                </td>
                <td className="py-3 px-4 text-right text-gray-700">
                  {fmt(tx.hargaJual)}
                </td>
                <td className="py-3 px-4 text-right">
                  <span
                    className={`font-semibold ${tx.keuntungan >= 0 ? "text-emerald-600" : "text-red-500"}`}
                  >
                    {fmt(tx.keuntungan)}
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-gray-500">
                  {tx.persenKeuntungan.toFixed(1)}%
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLOR[tx.statusPesanan] ?? "bg-gray-100 text-gray-500"}`}
                  >
                    {STATUS_LABEL[tx.statusPesanan] ?? tx.statusPesanan}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {tx.batchDetails.length > 0 && (
                    <button
                      onClick={() => setSelected(tx)}
                      className="text-blue-500 hover:text-blue-700 flex items-center gap-1 text-[11px] font-medium"
                    >
                      <Eye size={13} /> Detail
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 mt-1">
          <p className="text-xs text-gray-400">
            Halaman {pagination.page} dari {pagination.totalPages} ·{" "}
            {pagination.total} transaksi
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() =>
                onPageChange?.(pagination.page - 1, pagination.limit)
              }
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from(
              { length: Math.min(pagination.totalPages, 5) },
              (_, i) => {
                const p =
                  pagination.page <= 3
                    ? i + 1
                    : pagination.page >= pagination.totalPages - 2
                      ? pagination.totalPages - 4 + i
                      : pagination.page - 2 + i;
                if (p < 1 || p > pagination.totalPages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => onPageChange?.(p, pagination.limit)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${
                      p === pagination.page
                        ? "bg-emerald-600 text-white"
                        : "border border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                );
              },
            )}
            <button
              onClick={() =>
                onPageChange?.(pagination.page + 1, pagination.limit)
              }
              disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {selected && (
        <BatchDetailsModal
          transaction={selected}
          visible={true}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
