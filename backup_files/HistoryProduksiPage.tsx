import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { jadwalProduksiApi, JadwalProduksi } from '../../api/jadwal-produksi.api';
import { Loader2, History, PackageCheck, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';

const formatTanggal = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const formatRp = (num: number) => `Rp ${Math.round(num).toLocaleString('id-ID')}`;

const getBestBefore = (iso: string) => {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + 9);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const HistoryProduksiPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const gudangId = (user?.managedWarehouses as any[])?.[0]?.id || '';

  const [items, setItems] = useState<JadwalProduksi[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!gudangId) return;
      try {
        const res = await jadwalProduksiApi.getList({ gudangId, statusJadwal: 'SELESAI' });
        // Sort newest first
        setItems(res.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()));
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [gudangId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          <span className="text-sm font-medium">Memuat riwayat produksi...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl">
          <History className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Riwayat & HPP Produksi</h2>
          <p className="text-xs text-slate-500">Catatan eksekusi produksi yang telah selesai</p>
        </div>
        <span className="ml-auto bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1 rounded-full border border-slate-200">
          {items.length} Riwayat
        </span>
      </div>

      {items.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <PackageCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-600 font-medium">Belum ada riwayat produksi</p>
          <p className="text-xs text-slate-400 mt-1">Eksekusi jadwal produksi untuk melihat laporan HPP di sini</p>
        </div>
      )}

      <div className="grid gap-4">
        {items.map((item) => {
          const isExpanded = expandedId === item.id;
          const laporan = item.laporanEksekusi || [];
          const tglSelesai = item.updatedAt || item.createdAt;

          return (
            <div key={item.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all">
              {/* Card Header (Clickable) */}
              <div 
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
              >
                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
                    {item.komoditasNama}
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">Selesai</span>
                  </h4>
                  <div className="flex flex-wrap items-center gap-4 mt-1.5">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <History className="w-3.5 h-3.5" />
                      {formatTanggal(tglSelesai as string)}
                    </span>
                    <span className="text-xs font-semibold text-slate-600 border-l border-slate-300 pl-4">
                      Total Volume: {item.volumeTotalKg.toLocaleString('id-ID')} Kg
                    </span>
                    <span className="text-xs font-semibold text-red-600 border-l border-slate-300 pl-4">
                      Baik Digunakan Sebelum: {getBestBefore(tglSelesai as string)}
                    </span>
                  </div>
                </div>
                <div className="text-slate-400">
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>

              {/* Card Body (Expanded) */}
              {isExpanded && (
                <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-4">
                  {Array.isArray(laporan) && laporan.length > 0 ? (
                    laporan.map((lap: any, idx: number) => {
                      const hpp = lap.hppDetail;
                      return (
                        <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                          <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
                            <span className="font-bold text-sm text-slate-800">{lap.nama}</span>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${lap.lolosSop ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {lap.lolosSop ? 'Lolos QC' : 'Reject QC'}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-[10px] text-slate-500 font-semibold">Target Volume</p>
                              <p className="text-xs font-bold text-slate-800">{lap.targetVolumeKg} Kg</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-500 font-semibold">Penimbangan Akhir</p>
                              <p className="text-xs font-bold text-emerald-700">{lap.hasilPenimbanganAkhir} Kg</p>
                            </div>
                            {lap.catatanQc && (
                              <div className="col-span-2">
                                <p className="text-[10px] text-slate-500 font-semibold">Catatan QC</p>
                                <p className="text-xs text-red-600">{lap.catatanQc}</p>
                              </div>
                            )}
                          </div>

                          {lap.lolosSop && hpp && (
                            <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-3">
                              <h5 className="text-xs font-bold text-emerald-800 mb-2 flex items-center gap-1.5 border-b border-emerald-100 pb-2">
                                <DollarSign className="w-3.5 h-3.5" /> Rincian Kalkulator HPP
                              </h5>
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                                <div>
                                  <p className="text-[10px] text-emerald-600/70 font-semibold">Bahan Baku</p>
                                  <p className="text-xs font-bold text-emerald-900">{formatRp(hpp.bahanBaku || 0)}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-emerald-600/70 font-semibold">Tenaga Kerja</p>
                                  <p className="text-xs font-bold text-emerald-900">{formatRp(hpp.tenagaKerja || 0)}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-emerald-600/70 font-semibold">Kemasan</p>
                                  <p className="text-xs font-bold text-emerald-900">{formatRp(hpp.kemasan || 0)}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-emerald-600/70 font-semibold">Bhn Lainnya</p>
                                  <p className="text-xs font-bold text-emerald-900">{formatRp(hpp.bahanLain || 0)}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-emerald-600/70 font-semibold">Overhead</p>
                                  <p className="text-xs font-bold text-emerald-900">{formatRp(hpp.overhead || 0)}</p>
                                </div>
                              </div>
                              <div className="flex justify-between items-center bg-white p-2 rounded-md border border-emerald-100">
                                <div>
                                  <p className="text-[10px] text-emerald-600/70 font-semibold">Total Biaya</p>
                                  <p className="text-sm font-bold text-emerald-900">{formatRp(hpp.totalBiaya || 0)}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-emerald-600/70 font-semibold">Output Kemasan</p>
                                  <p className="text-sm font-bold text-emerald-900 text-center">{hpp.outputKg || 0} Kg</p>
                                </div>
                                <div className="text-right border-l border-emerald-100 pl-3">
                                  <p className="text-[10px] text-emerald-600/70 font-semibold">HPP per Kg</p>
                                  <p className="text-base font-black text-emerald-700">{formatRp(hpp.hppPerKg || 0)}</p>
                                </div>
                              </div>
                              {hpp.hargaJual > 0 && (
                                <div className="mt-2 bg-emerald-700 text-white p-2 rounded-md flex justify-between items-center">
                                  <div>
                                    <p className="text-[10px] text-emerald-200 font-semibold">Target Harga Jual</p>
                                    <p className="text-sm font-bold">{formatRp(hpp.hargaJual)}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[10px] text-emerald-200 font-semibold">Margin Didapat</p>
                                    <p className="text-sm font-bold">{formatRp(hpp.marginRp || 0)} <span className="text-emerald-300 text-xs font-normal">({(hpp.marginPersen || 0).toFixed(1)}%)</span></p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {lap.fotoBukti && (
                            <div className="mt-3">
                              <p className="text-[10px] text-slate-500 font-semibold mb-1">Bukti Foto</p>
                              <img src={lap.fotoBukti} alt="Bukti" className="h-20 w-20 object-cover rounded border border-slate-200" />
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-500 text-center py-4">Data eksekusi tidak tersedia.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HistoryProduksiPage;
