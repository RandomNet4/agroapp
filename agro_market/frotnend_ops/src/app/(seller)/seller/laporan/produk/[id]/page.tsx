"use client";

import React, { use } from "react";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";

import { ProfitReportTab } from "@/components/profit-report";

interface PageParams {
  id: string;
}

export default function LaporanKeuntunganProdukDetail({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const router = useRouter();
  const { id } = use(params);

  return (
    <div className="w-full h-full overflow-y-auto overscroll-contain pb-12">
      <div className="px-6 py-6 max-w-4xl mx-auto space-y-6">
        {/* ── Back + Header ── */}
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp size={22} className="text-emerald-600" />
              Laporan Keuntungan Produk
            </h1>
          </div>
        </div>

        <div className="animate-fade-in">
          <ProfitReportTab produkId={id} />
        </div>
      </div>
    </div>
  );
}
