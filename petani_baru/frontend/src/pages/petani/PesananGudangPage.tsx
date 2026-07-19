// =====================================================
// PETANI: PESANAN GUDANG (PO DARI GUDANG)
// =====================================================

import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { FileText, Calendar, Clock, Inbox, Sprout, CheckCircle2, ChevronRight, Truck } from 'lucide-react';
import { formatRupiah } from '../../data/dummy';

const PesananGudangPage: React.FC = () => {
  const { 
    tenderPetani: dummyTenderPetani, 
    tender: dummyTender, 
    komoditas: dummyKomoditas,
    currentUser,
    verifyTenderPetani 
  } = useData();

  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Filter PO allocations belonging to the logged-in farmer
  const myAllocations = dummyTenderPetani.filter(
    tp => tp.petaniId === currentUser?.id
  );

  const getTenderInfo = (tenderId: string) => {
    return dummyTender.find(t => t.id === tenderId);
  };

  const getKomoditasGambar = (komoditasNama: string) => {
    return dummyKomoditas.find(k => k.nama.toLowerCase() === komoditasNama.toLowerCase())?.gambar || '🌱';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide">Masuk (Baru)</span>;
      case 'approved':
        return <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide">Diproses</span>;
      case 'survey':
        return <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide">Dipanen</span>;
      case 'selesai':
        return <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide">Dikirim (Selesai)</span>;
      default:
        return <span className="bg-gray-50 text-gray-400 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide">{status}</span>;
    }
  };

  const handleUpdateStatus = async (id: string, currentStatus: string) => {
    let nextStatus = '';
    let confirmMsg = '';

    if (currentStatus === 'pending') {
      nextStatus = 'approved';
      confirmMsg = 'Mulai memproses pesanan PO ini?';
    } else if (currentStatus === 'approved') {
      nextStatus = 'survey';
      confirmMsg = 'Konfirmasi bahwa sayuran telah dipanen dan siap kirim?';
    } else if (currentStatus === 'survey') {
      nextStatus = 'selesai';
      confirmMsg = 'Konfirmasi bahwa sayuran telah dikirim ke Gudang Cianjur?';
    } else {
      return;
    }

    if (!window.confirm(confirmMsg)) return;

    setLoadingId(id);
    const success = await verifyTenderPetani(id, nextStatus, `Status diperbarui oleh petani pada ${new Date().toLocaleDateString('id-ID')}`);
    setLoadingId(null);
    if (!success) {
      alert('Gagal memperbarui status pesanan');
    }
  };

  return (
    <div className="animate-fade-in px-4 pt-4 pb-20">
      <div className="mb-6">
        <h1 className="page-title flex items-center gap-2"><Inbox size={24} className="text-primary-600" /> Pesanan Gudang</h1>
        <p className="text-xs text-gray-500 mt-1">Daftar Purchase Order (PO) Gudang Cianjur yang dialokasikan kepada Anda</p>
      </div>

      {myAllocations.length === 0 ? (
        <div className="card text-center py-12 text-gray-400 flex flex-col items-center justify-center">
          <FileText size={48} className="text-gray-300 mb-3" />
          <p className="font-semibold text-sm">Belum Ada Pesanan</p>
          <p className="text-[11px] text-gray-400 mt-1">Saat ini belum ada PO dari gudang yang dialokasikan untuk lahan Anda.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {myAllocations.map(alloc => {
            const tenderInfo = getTenderInfo(alloc.tenderId);
            const komoditasGambar = tenderInfo ? getKomoditasGambar(tenderInfo.komoditasNama) : '🌱';
            const volumeTon = (alloc.kesanggupanKg / 1000).toFixed(1);
            const harga = tenderInfo?.hargaPerKg || 0;
            const totalEstimasi = alloc.kesanggupanKg * harga;
            
            const tglPesan = tenderInfo?.createdAt 
              ? new Date(tenderInfo.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
              : new Date(alloc.tanggalDaftar).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
            
            const tglBatas = alloc.batasWaktu
              ? new Date(alloc.batasWaktu).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
              : '-';

            return (
              <div key={alloc.id} className="card border border-gray-100 p-4 bg-white shadow-sm rounded-2xl">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-3xl bg-gray-50 p-1.5 rounded-xl border border-gray-100">{komoditasGambar}</span>
                    <div>
                      <h3 className="font-bold text-gray-800 text-sm">{tenderInfo?.komoditasNama || 'Komoditas'}</h3>
                      <p className="text-[10px] text-gray-400">Order ID: {alloc.tenderId}</p>
                    </div>
                  </div>
                  <div>
                    {getStatusBadge(alloc.statusApproval)}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-xs border border-gray-100/50">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Alokasi Volume:</span>
                    <span className="font-bold text-gray-800">{volumeTon} Ton ({alloc.kesanggupanKg.toLocaleString()} kg)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Harga Beli Gudang:</span>
                    <span className="font-bold text-emerald-600">{formatRupiah(harga)}/kg</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200/50 pb-2 mb-1">
                    <span className="text-gray-400">Estimasi Pendapatan:</span>
                    <span className="font-extrabold text-gray-800">{formatRupiah(totalEstimasi)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[9px] text-gray-400 block font-bold uppercase tracking-wider">Tanggal Pesan</span>
                      <span className="font-semibold text-gray-700 text-[11px] flex items-center gap-1"><Calendar size={10} /> {tglPesan}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 block font-bold uppercase tracking-wider">Batas Pengiriman</span>
                      <span className="font-semibold text-amber-700 text-[11px] flex items-center gap-1"><Clock size={10} /> {tglBatas}</span>
                    </div>
                  </div>
                </div>

                {alloc.statusApproval !== 'selesai' && (
                  <button
                    onClick={() => handleUpdateStatus(alloc.id, alloc.statusApproval)}
                    disabled={loadingId === alloc.id}
                    className={`mt-3 w-full font-bold py-2.5 rounded-xl text-xs shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                      alloc.statusApproval === 'pending'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : alloc.statusApproval === 'approved'
                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {loadingId === alloc.id ? (
                      'Memproses...'
                    ) : alloc.statusApproval === 'pending' ? (
                      <>Terima & Proses Pesanan <ChevronRight size={14} /></>
                    ) : alloc.statusApproval === 'approved' ? (
                      <>Selesai Panen (Siap Kirim) <Sprout size={14} /></>
                    ) : (
                      <>Kirim Ke Gudang Cianjur <Truck size={14} /></>
                    )}
                  </button>
                )}

                {alloc.statusApproval === 'selesai' && (
                  <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-bold text-gray-400 bg-gray-50 border border-gray-100 rounded-xl py-2">
                    <CheckCircle2 size={14} className="text-gray-400" /> Pesanan Telah Dikirim ke Gudang
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PesananGudangPage;
