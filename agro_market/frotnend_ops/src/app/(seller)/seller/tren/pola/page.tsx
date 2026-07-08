"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  Activity,
  Loader2,
  Lightbulb,
  X,
  Package,
} from "lucide-react";
import Link from "next/link";

import {
  usePolaPenjualan,
  usePesananHarian,
} from "@/hooks/seller/useSellerTren";
import { useSellerDashboard } from "@/hooks/seller/useSellerDashboard";
import SalesHeatmap from "@/components/ecommerce/analytics/SalesHeatmap";
import SalesCalendar from "@/components/ecommerce/analytics/SalesCalendar";

function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function DailyOrdersPanel({
  tokoId,
  date,
  onClose,
}: {
  tokoId: string;
  date: string;
  onClose: () => void;
}) {
  const { data, isLoading } = usePesananHarian(tokoId, date);

  const displayDate = new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (isLoading)
    return (
      <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm animate-pulse h-64" />
    );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div className="flex justify-between items-center border-b border-gray-50 pb-3">
        <div>
          <h3 className="font-bold text-gray-800 text-sm">Pesanan Harian</h3>
          <p className="text-[10px] text-gray-400">{displayDate}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-md">
            {data?.length || 0} Pesanan
          </span>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
        {data?.length > 0 ? (
          data.map((p: any) => (
            <div
              key={p.id}
              className="border border-gray-100 rounded-xl p-3 hover:border-emerald-200 transition-colors"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-[10px] font-bold text-gray-800">
                    {p.kodePesanan}
                  </p>
                  <p className="text-[9px] text-gray-400 mt-0.5">
                    {p.pengguna.nama}
                  </p>
                </div>
                <p className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                  {formatRupiah(p.totalHarga)}
                </p>
              </div>
              <div className="space-y-2 border-t border-gray-50 pt-2 mt-2">
                {p.items.map((item: any) => (
                  <div
                    key={item.produkId}
                    className="flex items-center gap-2.5"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden shrink-0">
                      <img
                        src={item.gambar}
                        alt={item.namaProduk}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-gray-700 truncate">
                        {item.namaProduk}
                      </p>
                      <p className="text-[9px] text-gray-400">
                        {item.kuantitas} kg × {formatRupiah(item.hargaSatuan)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-10 opacity-60">
            <Package size={24} className="text-gray-300 mb-2" />
            <p className="text-[10px] text-gray-500">
              Tidak ada pesanan di tanggal ini.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PolaPenjualanPage() {
  const { store } = useSellerDashboard();
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(
    currentDate.getFullYear(),
  );
  const [periodType, setPeriodType] = useState<"YEAR" | "MONTH">("YEAR");
  const [selectedMonth, setSelectedMonth] = useState<number>(
    currentDate.getMonth() + 1,
  );
  const [selectedDate, setSelectedDate] = useState<string | undefined>();

  const { data, isLoading } = usePolaPenjualan(
    store?.id ?? "",
    selectedYear,
    periodType === "MONTH" ? selectedMonth : undefined,
  );

  const yearsList = [currentDate.getFullYear() - 1, currentDate.getFullYear()];

  // Find peak day & time if data is available
  let peakDay = "";
  let peakTime = "";
  let peakVal = 0;

  if (data?.heatmap && data.heatmap.length > 0) {
    let best = data.heatmap[0];
    data.heatmap.forEach((item) => {
      if (item.jumlahPesanan > best.jumlahPesanan) {
        best = item;
      }
    });

    if (best.jumlahPesanan > 0) {
      peakDay = best.hariLabel;
      const timeLabelMap: Record<string, string> = {
        PAGI: "Pagi (06:00 - 12:00)",
        SIANG: "Siang (12:00 - 17:00)",
        SORE: "Sore (17:00 - 21:00)",
        MALAM: "Malam (21:00 - 06:00)",
      };
      peakTime = timeLabelMap[best.sesi] || best.sesi;
      peakVal = best.jumlahPesanan;
    }
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div>
        <Link
          href="/seller/tren"
          className="text-xs text-gray-400 hover:text-emerald-600 inline-flex items-center gap-1 mb-2 font-medium"
        >
          <ArrowLeft size={12} /> Kembali ke Tren Bulanan
        </Link>
        <div className="flex items-center gap-2 mb-1">
          <Activity size={22} className="text-emerald-600" />
          <h1 className="text-2xl font-bold text-gray-900">
            Pola Penjualan & Sesi Teramai
          </h1>
        </div>
        <p className="text-gray-500 text-sm">
          Temukan pola hari dan jam sibuk ketika pelanggan paling aktif
          berbelanja di toko <strong>{store?.nama}</strong>
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-emerald-500" />
        </div>
      ) : (
        <>
          {/* Main Grid: Heatmap & Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Heatmap Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:col-span-2">
              <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-50">
                <div>
                  <h2 className="text-base font-bold text-gray-800">
                    Kalender Transaksi{" "}
                    {periodType === "MONTH" ? "Bulanan" : "Tahunan"}
                  </h2>
                  <p className="text-xs text-gray-400">
                    Distribusi pesanan harian berdasarkan kalender
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={periodType}
                    onChange={(e) =>
                      setPeriodType(e.target.value as "YEAR" | "MONTH")
                    }
                    className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 text-xs font-semibold text-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="MONTH">Per Bulan</option>
                    <option value="YEAR">Per Tahun</option>
                  </select>

                  {periodType === "MONTH" && (
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      {[
                        { value: 1, label: "Januari" },
                        { value: 2, label: "Februari" },
                        { value: 3, label: "Maret" },
                        { value: 4, label: "April" },
                        { value: 5, label: "Mei" },
                        { value: 6, label: "Juni" },
                        { value: 7, label: "Juli" },
                        { value: 8, label: "Agustus" },
                        { value: 9, label: "September" },
                        { value: 10, label: "Oktober" },
                        { value: 11, label: "November" },
                        { value: 12, label: "Desember" },
                      ].map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  )}

                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {yearsList.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {data && data.kalender && data.kalender.length > 0 ? (
                <SalesCalendar
                  kalender={data.kalender}
                  totalPesanan={data.totalPesanan}
                  selectedDate={selectedDate}
                  onDateClick={setSelectedDate}
                />
              ) : (
                <div className="text-center py-12 text-gray-400 text-sm">
                  Tidak ada data transaksi di tahun {selectedYear}.
                </div>
              )}

              <div className="mt-10 pt-8 border-t border-gray-100">
                <div className="mb-6">
                  <h2 className="text-base font-bold text-gray-800">
                    Peta Sebaran Waktu Belanja
                  </h2>
                  <p className="text-xs text-gray-400">
                    Intensitas pesanan berdasarkan hari dan sesi waktu
                  </p>
                </div>
                {data && data.heatmap && data.heatmap.length > 0 ? (
                  <SalesHeatmap
                    heatmap={data.heatmap}
                    totalPesanan={data.totalPesanan}
                  />
                ) : (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    Tidak ada data heatmap di tahun {selectedYear}.
                  </div>
                )}
              </div>
            </div>

            {/* Insight / Daily Orders Card */}
            <div className="space-y-4">
              {selectedDate ? (
                <DailyOrdersPanel
                  tokoId={store?.id ?? ""}
                  date={selectedDate}
                  onClose={() => setSelectedDate(undefined)}
                />
              ) : (
                <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 text-white rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Lightbulb size={20} className="text-emerald-300" />
                    <h3 className="font-bold text-sm text-emerald-100 uppercase tracking-wider">
                      Rekomendasi Pola
                    </h3>
                  </div>

                  {peakVal > 0 ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-emerald-300/80">
                          Waktu Pembelian Tersibuk
                        </p>
                        <p className="text-lg font-bold text-emerald-50 leading-tight mt-0.5">
                          Hari {peakDay}
                        </p>
                        <p className="text-sm font-semibold text-emerald-200">
                          Sesi {peakTime}
                        </p>
                      </div>

                      <p className="text-xs text-emerald-100/70 leading-relaxed pt-2 border-t border-white/10">
                        💡 <strong>Rekomendasi Stok & Promosi:</strong> Lakukan
                        restok barang sebelum hari <strong>{peakDay}</strong>{" "}
                        pagi. Pastikan kurir/admin standby pada sesi{" "}
                        <strong>{peakTime.split(" ")[0]}</strong> karena volume
                        pesanan tertinggi terjadi di waktu ini.
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-200/70 leading-relaxed">
                      Data pesanan belum mencukupi untuk memetakan sesi belanja
                      teramai. Lakukan lebih banyak transaksi untuk melihat
                      insight pola di sini!
                    </p>
                  )}
                </div>
              )}

              {/* Sesi Detail info */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                <h4 className="font-bold text-xs text-gray-400 uppercase tracking-wider">
                  Definisi Sesi Waktu
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-gray-50 rounded-xl p-2.5">
                    <p className="font-semibold text-gray-700">🌅 Pagi</p>
                    <p className="text-gray-400 mt-0.5">06:00 – 12:00 WIB</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2.5">
                    <p className="font-semibold text-gray-700">☀️ Siang</p>
                    <p className="text-gray-400 mt-0.5">12:00 – 17:00 WIB</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2.5">
                    <p className="font-semibold text-gray-700">🌇 Sore</p>
                    <p className="text-gray-400 mt-0.5">17:00 – 21:00 WIB</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2.5">
                    <p className="font-semibold text-gray-700">🌃 Malam</p>
                    <p className="text-gray-400 mt-0.5">21:00 – 06:00 WIB</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
