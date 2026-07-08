"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus, Package } from "lucide-react";

import type {
  KategoriTerlarisData,
  ProdukTerlarisItem,
} from "@/lib/api/analytics";

const RANK_ICON = ["🥇", "🥈", "🥉"];

function formatRupiah(n: number) {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return `Rp ${n.toFixed(0)}`;
}

function TrendBadge({ persen, arah }: { persen?: number; arah?: string }) {
  if (persen === undefined || persen === null) return null;
  const isUp = arah === "UP" || persen > 0;
  const isDown = arah === "DOWN" || persen < 0;

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full
      ${isUp ? "bg-green-100 text-green-700" : isDown ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}
    >
      {isUp ? (
        <TrendingUp size={10} />
      ) : isDown ? (
        <TrendingDown size={10} />
      ) : (
        <Minus size={10} />
      )}
      {Math.abs(persen)}%
    </span>
  );
}

function ProdukRow({
  item,
  showTrend,
}: {
  item: ProdukTerlarisItem;
  showTrend: boolean;
}) {
  const rankIcon = RANK_ICON[item.rank - 1] ?? `#${item.rank}`;
  const barWidth = item.persenDariKategori
    ? Math.max(8, item.persenDariKategori)
    : 30;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-lg px-2 transition-colors group">
      {/* Rank */}
      <div className="w-7 text-center text-lg leading-none flex-shrink-0">
        {item.rank <= 3 ? (
          rankIcon
        ) : (
          <span className="text-xs font-bold text-gray-400">#{item.rank}</span>
        )}
      </div>

      {/* Gambar produk */}
      <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
        {item.produk.gambarUrl ? (
          <img
            src={item.produk.gambarUrl}
            alt={item.produk.nama}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={14} className="text-gray-400" />
          </div>
        )}
      </div>

      {/* Info produk */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">
          {item.produk.nama}
        </p>
        {item.toko && (
          <p className="text-xs text-gray-400 truncate">{item.toko.nama}</p>
        )}
        {/* Progress bar */}
        {item.persenDariKategori !== undefined && (
          <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all"
              style={{ width: `${barWidth}%` }}
            />
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-gray-800">
          {item.jumlahTerjual.toFixed(1)}{" "}
          <span className="text-xs font-normal text-gray-400">kg</span>
        </p>
        <p className="text-xs text-gray-400">
          {formatRupiah(item.totalRevenue)}
        </p>
        {showTrend && (
          <div className="mt-0.5">
            <TrendBadge persen={item.trendPersen} arah={item.trendArah} />
          </div>
        )}
      </div>
    </div>
  );
}

interface KategoriTerlarisCardProps {
  data: KategoriTerlarisData;
  showTrend?: boolean;
}

export default function KategoriTerlarisCard({
  data,
  showTrend = false,
}: KategoriTerlarisCardProps) {
  const { kategori, topProduk, totalKategoriTerjual, totalKategoriRevenue } =
    data;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Header kategori */}
      <div className="px-5 pt-4 pb-3 border-b border-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {kategori.icon && (
              <span className="text-2xl leading-none">{kategori.icon}</span>
            )}
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {kategori.nama}
              </h3>
              <p className="text-xs text-gray-400">
                {topProduk.length} produk teratas
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-emerald-600">
              {totalKategoriTerjual.toFixed(0)} kg
            </p>
            <p className="text-xs text-gray-400">
              {formatRupiah(totalKategoriRevenue)}
            </p>
          </div>
        </div>
      </div>

      {/* Produk list */}
      <div className="px-3 pb-3">
        {topProduk.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">
            Belum ada data penjualan
          </div>
        ) : (
          topProduk.map((item) => (
            <ProdukRow key={item.produk.id} item={item} showTrend={showTrend} />
          ))
        )}
      </div>
    </div>
  );
}
