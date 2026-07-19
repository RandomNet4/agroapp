// =====================================================
// REKOMENDASI TANAM - PETANI (DENGAN TABS)
// =====================================================

import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { ArrowLeft, Sprout, TrendingUp, AlertTriangle, Search, BarChart3, List, Lightbulb } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../../components/StatusBadge';
import { formatRupiah } from '../../data/dummy';;;

type TabType = 'rekomendasi' | 'daftar-produk' | 'supply-tracking';

const RekomendasiTanamPage: React.FC = () => {
  const {
    komoditas: dummyKomoditas,
    rekomendasiTanam: dummyRekomendasiTanam,
    tender: dummyTender,
    currentUser,
    lahan: dummyLahan,
    tanamanAktif: dummyTanamanAktif
  } = useData();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabType>('rekomendasi');
  const [search, setSearch] = useState('');
  const [kategoriFilter, setKategoriFilter] = useState('semua');

  const kategoris = ['semua', ...new Set(dummyKomoditas.map(k => k.kategori))];

  const filteredKomoditas = dummyKomoditas.filter(k => {
    const matchSearch = k.nama.toLowerCase().includes(search.toLowerCase());
    const matchKategori = kategoriFilter === 'semua' || k.kategori === kategoriFilter;
    return matchSearch && matchKategori;
  });

  const supplyKurang = dummyKomoditas.filter(k => k.supplyStatus === 'kurang');
  const supplyCukup = dummyKomoditas.filter(k => k.supplyStatus === 'cukup');
  const supplyBerlebih = dummyKomoditas.filter(k => k.supplyStatus === 'berlebih');

  const priorityWeight: Record<string, number> = {
    tinggi: 3,
    sedang: 2,
    rendah: 1
  };

  const sortedRekomendasi = [...dummyRekomendasiTanam].sort((a, b) => {
    const priorityA = priorityWeight[a.prioritas] || 0;
    const priorityB = priorityWeight[b.prioritas] || 0;
    if (priorityB !== priorityA) {
      return priorityB - priorityA;
    }
    return b.selisihKg - a.selisihKg;
  });

  // --- Asisten Pintar AI Rekomendasi Personal ---
  const petaniLahan = dummyLahan.filter(l => l.petaniId === currentUser?.id && l.statusVerifikasi === 'approved');
  const totalLuasLahan = petaniLahan.reduce((sum, l) => sum + l.luasHektar, 0);

  // 1. Hitung Riwayat Permintaan (volume pesanan komoditas terbanyak)
  const orderCounts: Record<string, number> = {};
  dummyTender.forEach(t => {
    orderCounts[t.komoditasNama] = (orderCounts[t.komoditasNama] || 0) + t.kebutuhanKg;
  });

  // 2. Jadwal panen petani lain (kompetisi)
  const competitorHarvests: Record<string, number> = {};
  dummyTanamanAktif.forEach(t => {
    if (t.petaniId !== currentUser?.id && t.statusVerifikasi === 'approved') {
      competitorHarvests[t.komoditasNama] = (competitorHarvests[t.komoditasNama] || 0) + t.estimasiHasilKg;
    }
  });

  // 3. Hitung kecocokan personal
  const personalRecs = dummyKomoditas.map(komoditas => {
    const demandVolume = orderCounts[komoditas.nama] || 0;
    const competitorVolume = competitorHarvests[komoditas.nama] || 0;
    const umurPanen = komoditas.umurPanenHari || 60;

    // Lahan sempit prioritize cepat panen (< 60 hari); Lahan luas prioritize volume tinggi
    let landFactor = 0;
    if (totalLuasLahan > 0.5) {
      landFactor = umurPanen >= 60 ? 30 : 15;
    } else {
      landFactor = umurPanen < 60 ? 30 : 10;
    }

    // Skor akhir
    const baseScore = demandVolume > 0 ? 40 : 15;
    const competitionFactor = Math.max(0, 30 - (competitorVolume / 1500) * 10);
    const score = Math.min(98, Math.round(baseScore + competitionFactor + landFactor + 10));

    let alasanPersonal = '';
    if (demandVolume > 0 && competitorVolume === 0) {
      alasanPersonal = `Permintaan pasar sangat tinggi (${(demandVolume / 1000).toFixed(1)} ton) dan belum ada petani mitra lain yang menanamnya. Peluang besar!`;
    } else if (competitorVolume > 2000) {
      alasanPersonal = `Kompetisi tinggi (${(competitorVolume / 1000).toFixed(1)} ton siap panen dari petani lain). Disarankan menanam secukupnya saja.`;
    } else if (totalLuasLahan <= 0.5 && umurPanen < 60) {
      alasanPersonal = `Lahan Anda (${totalLuasLahan.toFixed(2)} Ha) cocok untuk tanaman cepat panen seperti ${komoditas.nama} (${umurPanen} hari).`;
    } else {
      alasanPersonal = `Keseimbangan pasar baik dengan harga pasar stabil di kisaran ${formatRupiah(komoditas.hargaSaatIni)}/kg.`;
    }

    return {
      komoditas,
      score,
      alasanPersonal,
      demandVolume,
      competitorVolume,
      umurPanen
    };
  }).sort((a, b) => b.score - a.score);

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-700 to-teal-600 text-white px-4 py-4 pb-6 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-xl">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-display font-bold text-lg">Rekomendasi Tanam</h1>
            <p className="text-green-100 text-xs">Komoditas yang disarankan berdasarkan kebutuhan pasar</p>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex gap-1 bg-white/10 rounded-xl p-1">
          <button
            onClick={() => setTab('rekomendasi')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${tab === 'rekomendasi' ? 'bg-white text-emerald-700' : 'text-white/80 hover:text-white'
              }`}
          >
            <Lightbulb size={14} /> Rekomendasi
          </button>
          <button
            onClick={() => setTab('daftar-produk')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${tab === 'daftar-produk' ? 'bg-white text-emerald-700' : 'text-white/80 hover:text-white'
              }`}
          >
            <List size={14} /> Semua Produk
          </button>
          <button
            onClick={() => setTab('supply-tracking')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${tab === 'supply-tracking' ? 'bg-white text-emerald-700' : 'text-white/80 hover:text-white'
              }`}
          >
            <BarChart3 size={14} /> Supply
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 pb-4 space-y-3">
        {/* ===== TAB REKOMENDASI ===== */}
        {tab === 'rekomendasi' && (
          <>
            {/* Peringatan Oversupply */}
            {supplyBerlebih.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-3">
                <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Peringatan Kelebihan Produksi</p>
                  <p className="text-xs text-amber-600 mt-1">
                    {supplyBerlebih.map(k => k.nama).join(', ')} sedang kelebihan supply. Hindari menanam komoditas ini untuk sementara.
                  </p>
                </div>
              </div>
            )}

            {/* Asisten Rekomendasi Personal AI */}
            <div className="bg-gradient-to-br from-emerald-800 to-teal-700 text-white rounded-2xl p-4 shadow-md relative overflow-hidden border border-emerald-600/30 mb-2">
              <div className="absolute top-0 right-0 w-28 h-28 bg-white/[0.04] rounded-full -mr-10 -mt-10 blur-xl" />
              <div className="flex items-center gap-2 mb-3 relative z-10">
                <h3 className="font-bold text-xs uppercase tracking-wider text-amber-200"></h3>
              </div>
              <p className="text-xs text-white/90 leading-relaxed mb-4 relative z-10">
                Berdasarkan lahan Anda seluas <b>{totalLuasLahan.toFixed(2)} Ha</b>, riwayat permintaan pasar, dan jadwal panen petani lain, berikut saran terbaik:
              </p>

              <div className="space-y-2.5 relative z-10">
                {personalRecs.slice(0, 2).map((item) => (
                  <div key={item.komoditas.id} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-3xl shrink-0">{item.komoditas.gambar}</span>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm truncate">{item.komoditas.nama}</h4>
                        <p className="text-[10px] text-white/80 mt-0.5 leading-snug">{item.alasanPersonal}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[8px] bg-white/15 px-1.5 py-0.5 rounded font-semibold">Umur: {item.umurPanen} hari</span>
                          {item.demandVolume > 0 && (
                            <span className="text-[8px] bg-amber-400/20 text-amber-200 px-1.5 py-0.5 rounded font-semibold">Permintaan Tinggi</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-center shrink-0">
                      <span className="text-[8px] text-white/60 block font-semibold uppercase tracking-wider">Kecocokan</span>
                      <span className="text-sm font-extrabold text-amber-300">{item.score}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rekomendasi Cards */}
            {sortedRekomendasi.map(rek => {
              const tenderId = rek.id.replace('REK_', '');
              const relatedTender = dummyTender.find(t => t.id === tenderId);

              // Extract actual notes from warehouse request description
              const desc = relatedTender?.deskripsi || rek.alasan || '';
              const catatanGudang = desc.replace(/\[Permintaan Gudang:[^\]]+\]\s*/, '').trim();

              const tglPO = relatedTender?.createdAt
                ? new Date(relatedTender.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                : '-';

              const tglDeadline = relatedTender?.tanggalBerakhir
                ? new Date(relatedTender.tanggalBerakhir).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                : '-';

              const komoditasGambar = dummyKomoditas.find(k => k.id === rek.komoditasId || k.nama.toLowerCase().includes(rek.komoditasNama.toLowerCase()))?.gambar || '🌱';

              return (
                <div key={rek.id} className={`bg-white rounded-2xl border-l-4 shadow-sm border border-gray-100 p-4 transition-all duration-200 hover:shadow-md ${rek.prioritas === 'tinggi' ? 'border-l-red-400' : rek.prioritas === 'sedang' ? 'border-l-amber-400' : 'border-l-blue-400'
                  }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{komoditasGambar}</span>
                      <div>
                        <h3 className="font-bold text-gray-800 text-sm">{rek.komoditasNama}</h3>
                        <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full ${rek.prioritas === 'tinggi' ? 'bg-red-50 text-red-600' : rek.prioritas === 'sedang' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                          }`}>
                          Prioritas {rek.prioritas}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-gray-400 block uppercase font-bold tracking-wider">Harga Penawaran</span>
                      <span className="font-extrabold text-emerald-600 text-sm">{formatRupiah(rek.estimasiHargaJual)}/kg</span>
                    </div>
                  </div>

                  {/* Detail Permintaan Gudang */}
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100/50 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-200/50">
                      <span className="text-gray-400 font-medium">Asal Gudang:</span>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">Gudang Cianjur</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <span className="text-[9px] text-gray-400 block uppercase font-bold tracking-wider">Volume Permintaan</span>
                        <span className="font-bold text-gray-800 text-xs">{(rek.kebutuhanKg / 1000).toFixed(1)} ton ({rek.kebutuhanKg.toLocaleString()} kg)</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 block uppercase font-bold tracking-wider">Defisit Stok</span>
                        <span className="font-bold text-red-600 text-xs">{(rek.selisihKg / 1000).toFixed(1)} ton ({rek.selisihKg.toLocaleString()} kg)</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <div>
                        <span className="text-[9px] text-gray-400 block uppercase font-bold tracking-wider">Tanggal Pesan</span>
                        <span className="font-semibold text-gray-700 text-[11px]">{tglPO}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 block uppercase font-bold tracking-wider">Batas Pengiriman</span>
                        <span className="font-semibold text-amber-700 text-[11px]">{tglDeadline}</span>
                      </div>
                    </div>

                    {catatanGudang && (
                      <div className="bg-white/80 rounded-lg p-2 text-[10px] text-gray-500 italic border border-gray-100">
                        Catatan: "{catatanGudang}"
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => navigate(`/petani/data-lahan/tambah-tanaman?komoditasId=${rek.komoditasId}&komoditasNama=${encodeURIComponent(rek.komoditasNama)}&kebutuhanKg=${rek.selisihKg}`)}
                    className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    Penuhi Permintaan
                  </button>
                </div>
              );
            })}
          </>
        )}

        {/* ===== TAB DAFTAR PRODUK / SAYURAN ===== */}
        {tab === 'daftar-produk' && (
          <>
            {/* Search */}
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari produk/sayuran..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input-field pl-10"
              />
            </div>

            {/* Kategori */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {kategoris.map(k => (
                <button
                  key={k}
                  onClick={() => setKategoriFilter(k)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${kategoriFilter === k ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
                    }`}
                >
                  {k === 'semua' ? 'Semua' : k.charAt(0).toUpperCase() + k.slice(1)}
                </button>
              ))}
            </div>

            {/* Summary */}
            <div className="bg-primary-50 rounded-xl p-3 text-center">
              <p className="text-xs text-primary-700 font-medium">Total {filteredKomoditas.length} produk ditemukan</p>
            </div>

            {/* Produk Table */}
            {filteredKomoditas.map(k => (
              <div key={k.id} className="card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{k.gambar}</span>
                    <div>
                      <h3 className="font-semibold text-sm">{k.nama}</h3>
                      <p className="text-xs text-gray-400 capitalize">{k.kategori}</p>
                    </div>
                  </div>
                  <StatusBadge status={k.supplyStatus} size="sm" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-gray-500">Petani Aktif</p>
                    <p className="font-bold text-lg text-primary-700">{k.jumlahPetaniAktif}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-gray-500">Total Estimasi</p>
                    <p className="font-bold text-lg">{(k.totalEstimasiProduksiKg / 1000).toFixed(1)} <span className="text-xs font-normal">ton</span></p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-gray-500">Estimasi Panen</p>
                    <p className="font-semibold">{k.estimasiBulanPanen}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-gray-500">Harga Saat Ini</p>
                    <p className="font-semibold">{formatRupiah(k.hargaSaatIni)}</p>
                  </div>
                </div>
                {/* Supply Bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                    <span>Supply vs Kebutuhan</span>
                    <span>{((k.totalEstimasiProduksiKg / k.kebutuhanBulananKg) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${k.supplyStatus === 'kurang' ? 'bg-red-500' : k.supplyStatus === 'cukup' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      style={{ width: `${Math.min((k.totalEstimasiProduksiKg / k.kebutuhanBulananKg) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>Supply: {(k.totalEstimasiProduksiKg / 1000).toFixed(1)} ton</span>
                    <span>Kebutuhan: {(k.kebutuhanBulananKg / 1000).toFixed(1)} ton</span>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ===== TAB SUPPLY TRACKING ===== */}
        {tab === 'supply-tracking' && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{supplyKurang.length}</p>
                <p className="text-[10px] text-red-500 font-medium">Kurang</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">{supplyCukup.length}</p>
                <p className="text-[10px] text-emerald-500 font-medium">Cukup</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{supplyBerlebih.length}</p>
                <p className="text-[10px] text-amber-500 font-medium">Berlebih</p>
              </div>
            </div>

            {/* Kurang Supply */}
            <div>
              <h3 className="font-semibold text-sm text-red-700 mb-2 flex items-center gap-1">
                <AlertTriangle size={14} /> Komoditas Kurang Supply — Perlu Lebih Banyak Petani
              </h3>
              {supplyKurang.map(k => (
                <div key={k.id} className="card mb-2 border-l-4 border-l-red-400">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{k.gambar}</span>
                      <div>
                        <p className="font-semibold text-sm">{k.nama}</p>
                        <p className="text-xs text-gray-500">{k.jumlahPetaniAktif} petani aktif</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-red-600 font-semibold">
                        Kurang {((k.kebutuhanBulananKg - k.totalEstimasiProduksiKg) / 1000).toFixed(1)} ton
                      </p>
                      <p className="text-[10px] text-gray-400">Panen: {k.estimasiBulanPanen}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Cukup */}
            <div>
              <h3 className="font-semibold text-sm text-emerald-700 mb-2 flex items-center gap-1">
                <Sprout size={14} /> Supply Cukup
              </h3>
              {supplyCukup.map(k => (
                <div key={k.id} className="card mb-2 border-l-4 border-l-emerald-400">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{k.gambar}</span>
                      <p className="font-semibold text-sm">{k.nama}</p>
                    </div>
                    <p className="text-xs text-emerald-600 font-medium">{k.jumlahPetaniAktif} petani</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Berlebih */}
            <div>
              <h3 className="font-semibold text-sm text-amber-700 mb-2 flex items-center gap-1">
                <TrendingUp size={14} /> Supply Berlebih — Hindari Menanam
              </h3>
              {supplyBerlebih.map(k => (
                <div key={k.id} className="card mb-2 border-l-4 border-l-amber-400">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{k.gambar}</span>
                      <div>
                        <p className="font-semibold text-sm">{k.nama}</p>
                        <p className="text-xs text-gray-500">{k.jumlahPetaniAktif} petani aktif</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-amber-600 font-semibold">
                        Lebih {((k.totalEstimasiProduksiKg - k.kebutuhanBulananKg) / 1000).toFixed(1)} ton
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RekomendasiTanamPage;
