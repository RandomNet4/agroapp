import React, { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { jadwalProduksiApi, JadwalProduksi } from '../../api/jadwal-produksi.api';
import { Loader2, PlayCircle, X, CheckCircle, Package, Users, FileCheck2, AlertCircle, Camera, Plus, Trash2 } from 'lucide-react';

const BUNCIS_SOP = ['Penimbangan', 'Pemotongan', 'Pencucian', 'Perebusan Blanching', 'Perendaman Air Es', 'Penirisan', 'Penimbangan', 'Packing Vacum'];
const WORTEL_SOP = ['Penimbangan', 'Pencucian 1', 'Pengupasan Kulit', 'Pencucian 2', 'Pemotongan', 'Penyortiran', 'Perebusan Blanching', 'Perendaman Air Es', 'Penirisan', 'Penimbangan Akhir'];
const JAGUNG_SOP = ['Penimbangan', 'Pencucian', 'Perebusan Blanching', 'Perendaman Air Es', 'Penirisan', 'Penimbangan'];

const YIELD_LOSS_MAP: Record<string, number> = {
  Wortel: 35,
  Jagung: 70,
  Buncis: 7,
};

const getSopByKomoditas = (nama: string) => {
  const nm = nama.toLowerCase();
  if (nm.includes('buncis')) return BUNCIS_SOP;
  if (nm.includes('wortel')) return WORTEL_SOP;
  if (nm.includes('jagung')) return JAGUNG_SOP;
  return ['Penimbangan', 'Pencucian', 'Sortir', 'Pengemasan'];
};

const formatTanggal = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

type PekerjaInput = { id: string; namaPegawai: string; kgDikerjakan: string };

const PemrosesanSortirPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const gudangId = (user?.managedWarehouses as any[])?.[0]?.id || '';

  const [items, setItems] = useState<JadwalProduksi[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<JadwalProduksi | null>(null);

  // Form State
  const [pekerjaList, setPekerjaList] = useState<PekerjaInput[]>([{ id: '1', namaPegawai: '', kgDikerjakan: '' }]);
  
  // State per komoditas: checklist SOP, catatan gagal, hasil kemasan
  const [checklist, setChecklist] = useState<Record<number, Record<string, boolean>>>({});
  const [catatanGagal, setCatatanGagal] = useState<Record<number, string>>({});
  
  // Packaging states
  const [kemasan1kg, setKemasan1kg] = useState<Record<number, string>>({});
  const [kemasan2_5kg, setKemasan2_5kg] = useState<Record<number, string>>({});
  const [kemasanCustomPack, setKemasanCustomPack] = useState<Record<number, string>>({});
  const [kemasanCustomSize, setKemasanCustomSize] = useState<Record<number, string>>({});
  
  const [hasilTimbang, setHasilTimbang] = useState<Record<number, string>>({});
  
  // Photo proof state
  const [fotoBukti, setFotoBukti] = useState<string | null>(null);
  
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchItems = async () => {
    if (!gudangId) return;
    try {
      const res = await jadwalProduksiApi.getList({ gudangId, statusJadwal: 'AKTIF' });
      setItems(res || []);
    } catch (error) {
      console.error('Error fetching jadwal aktif:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, [gudangId]);

  const openModal = (jadwal: JadwalProduksi) => {
    setModal(jadwal);
    setPekerjaList([{ id: Date.now().toString(), namaPegawai: '', kgDikerjakan: '' }]);
    setChecklist({});
    setCatatanGagal({});
    setKemasan1kg({});
    setKemasan2_5kg({});
    setKemasanCustomPack({});
    setKemasanCustomSize({});
    setHasilTimbang({});
    setFotoBukti(null);
  };

  const handleCheckbox = (komoditasIndex: number, step: string, checked: boolean) => {
    setChecklist(prev => ({
      ...prev,
      [komoditasIndex]: {
        ...(prev[komoditasIndex] || {}),
        [step]: checked
      }
    }));
  };

  const isAllChecked = (komoditasIndex: number, sopList: string[]) => {
    const checks = checklist[komoditasIndex] || {};
    return sopList.every(step => checks[step] === true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoBukti(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getEstimasiHasil = (nama: string, rawVolume: number) => {
    // Cari mapping yield terdekat (case insensitive)
    let yieldLoss = 0;
    const key = Object.keys(YIELD_LOSS_MAP).find(k => nama.toLowerCase().includes(k.toLowerCase()));
    if (key) yieldLoss = YIELD_LOSS_MAP[key];
    
    const penyusutanKg = rawVolume * (yieldLoss / 100);
    return Math.max(0, rawVolume - penyusutanKg);
  };

  const calculateTotalPkgKg = (idx: number) => {
    const k1 = parseFloat(kemasan1kg[idx]) || 0;
    const k25 = parseFloat(kemasan2_5kg[idx]) || 0;
    const customPack = parseFloat(kemasanCustomPack[idx]) || 0;
    const customSize = parseFloat(kemasanCustomSize[idx]) || 0;
    return (k1 * 1) + (k25 * 2.5) + (customPack * customSize);
  };

  const handleSubmit = async () => {
    if (!modal) return;
    setSubmitting(true);
    try {
      // Build Laporan Eksekusi
      const laporan = modal.detailKomoditas?.map((dk: any, idx: number) => {
        const sopList = getSopByKomoditas(dk.nama);
        const lolos = isAllChecked(idx, sopList);
        
        const rawVol = parseFloat(dk.volumeKg) || 0;
        const estimasi = getEstimasiHasil(dk.nama, rawVol);
        const timbangAkhir = parseFloat(hasilTimbang[idx]) || 0;
        
        // Cek jika penimbangan tidak sesuai estimasi (selisih > 0.1)
        const isSesuai = Math.abs(timbangAkhir - estimasi) <= 0.1;
        
        return {
          nama: dk.nama,
          targetVolumeKg: dk.volumeKg,
          estimasiHasilKg: estimasi,
          hasilPenimbanganAkhir: timbangAkhir,
          lolosSop: lolos,
          catatanQc: (!lolos || !isSesuai) ? (catatanGagal[idx] || 'Catatan tidak diisi') : null,
          hasilKemasan: lolos ? {
            kemasan1kg: parseFloat(kemasan1kg[idx]) || 0,
            kemasan2_5kg: parseFloat(kemasan2_5kg[idx]) || 0,
            customPack: parseFloat(kemasanCustomPack[idx]) || 0,
            customSize: parseFloat(kemasanCustomSize[idx]) || 0,
            totalKg: calculateTotalPkgKg(idx)
          } : null,
          sopDilakukan: checklist[idx] || {},
          fotoBukti
        };
      });

      const pekerja = pekerjaList.map(p => ({
        namaPegawai: p.namaPegawai,
        kgDikerjakan: p.kgDikerjakan
      })).filter(p => p.namaPegawai && parseFloat(p.kgDikerjakan) > 0);

      await jadwalProduksiApi.eksekusi(modal.id, {
        pekerja,
        laporanEksekusi: laporan,
      });

      setModal(null);
      fetchItems();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Terjadi kesalahan saat mengeksekusi produksi.');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          <span className="text-sm font-medium">Memuat antrean produksi...</span>
        </div>
      </div>
    );
  }

  // Validasi Pekerja Total Kg
  const totalPekerjaKg = pekerjaList.reduce((sum, p) => sum + (parseFloat(p.kgDikerjakan) || 0), 0);
  const maxVolumeJadwal = modal?.volumeTotalKg || 0;
  const isPekerjaOver = totalPekerjaKg > maxVolumeJadwal;
  
  // Validasi Keseluruhan Form
  let isFormValid = pekerjaList.every(p => p.namaPegawai.trim() !== '' && parseFloat(p.kgDikerjakan) > 0) && !isPekerjaOver;
  
  if (modal?.detailKomoditas) {
    modal.detailKomoditas.forEach((dk: any, idx: number) => {
      const sopList = getSopByKomoditas(dk.nama);
      const lolos = isAllChecked(idx, sopList);
      
      const rawVol = parseFloat(dk.volumeKg) || 0;
      const estimasi = getEstimasiHasil(dk.nama, rawVol);
      const timbangAkhir = parseFloat(hasilTimbang[idx]) || 0;
      const hasPenimbangan = !!hasilTimbang[idx];
      
      // Khusus untuk yang lolos, jika penimbangan beda dengan estimasi, butuh catatan
      const isSesuai = Math.abs(timbangAkhir - estimasi) <= 0.1;
      
      if (lolos) {
        if (!hasPenimbangan) isFormValid = false;
        if (!isSesuai && !catatanGagal[idx]) isFormValid = false;
      } else {
        if (!catatanGagal[idx]) isFormValid = false;
      }
    });
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl">
          <PlayCircle className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Eksekusi Produksi</h2>
          <p className="text-xs text-slate-500">Jalankan SOP dan produksi untuk jadwal yang aktif</p>
        </div>
        <span className="ml-auto bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-200">
          {items.length} Jadwal Aktif
        </span>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <p className="text-sm text-slate-600 font-medium">Semua produksi sudah selesai dieksekusi</p>
          <p className="text-xs text-slate-400 mt-1">Tidak ada jadwal aktif saat ini</p>
        </div>
      )}

      {/* List */}
      <div className="grid gap-3">
        {items.map((item) => (
          <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex-1">
              <h4 className="text-sm font-bold text-slate-800 mb-1">{item.komoditasNama}</h4>
              <div className="flex items-center gap-4">
                <span className="text-xs text-slate-500">
                  Total Volume Awal: <strong className="text-emerald-700">{item.volumeTotalKg.toLocaleString('id-ID')} Kg</strong>
                </span>
                <span className="text-xs text-slate-400">
                  Tenggat: {formatTanggal(item.tenggat)}
                </span>
              </div>
            </div>
            <button
              onClick={() => openModal(item)}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
            >
              Lakukan Proses
            </button>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-600" />
                Proses Produksi & QC
              </h3>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600 bg-white p-1 rounded-md border border-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Pegawai Section */}
              <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-sm text-emerald-800 flex items-center gap-1.5">
                    <Users className="w-4 h-4" /> Pencatatan Pekerja (Rp 1.500/kg)
                  </h4>
                  <button 
                    onClick={() => setPekerjaList([...pekerjaList, { id: Date.now().toString(), namaPegawai: '', kgDikerjakan: '' }])}
                    className="text-xs flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors font-semibold"
                  >
                    <Plus className="w-3 h-3" /> Tambah Pegawai
                  </button>
                </div>

                <div className="space-y-3">
                  {pekerjaList.map((pekerja, pIdx) => (
                    <div key={pekerja.id} className="flex flex-col sm:flex-row gap-3 items-end bg-white p-3 rounded-lg border border-emerald-100 shadow-sm relative">
                      <div className="flex-1 w-full">
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">Nama Pegawai <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={pekerja.namaPegawai}
                          onChange={(e) => {
                            const newL = [...pekerjaList];
                            newL[pIdx].namaPegawai = e.target.value;
                            setPekerjaList(newL);
                          }}
                          placeholder="Masukkan nama..."
                          className="w-full border border-emerald-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="flex-1 w-full">
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">Bekerja (Kg) <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            step="0.5"
                            value={pekerja.kgDikerjakan}
                            onChange={(e) => {
                              const newL = [...pekerjaList];
                              newL[pIdx].kgDikerjakan = e.target.value;
                              setPekerjaList(newL);
                            }}
                            placeholder="Contoh: 100"
                            className="w-full border border-emerald-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500 pr-8"
                          />
                          <span className="absolute right-3 top-2 text-xs text-emerald-600 font-bold">Kg</span>
                        </div>
                      </div>
                      <div className="w-full sm:w-1/4">
                        <div className="text-xs text-emerald-800 font-bold py-2 bg-emerald-50 text-center rounded-lg border border-emerald-100">
                          Rp {(parseFloat(pekerja.kgDikerjakan || '0') * 1500).toLocaleString('id-ID')}
                        </div>
                      </div>
                      {pekerjaList.length > 1 && (
                        <button 
                          onClick={() => setPekerjaList(pekerjaList.filter(p => p.id !== pekerja.id))}
                          className="absolute -top-2 -right-2 bg-white border border-red-200 text-red-500 p-1 rounded-full hover:bg-red-50 shadow-sm"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className={`mt-3 flex justify-between items-center text-xs font-bold p-2 rounded-lg border ${isPekerjaOver ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}`}>
                  <span>Total Kinerja Pekerja: {totalPekerjaKg.toLocaleString('id-ID')} Kg</span>
                  <span>Max Volume Jadwal: {maxVolumeJadwal.toLocaleString('id-ID')} Kg</span>
                </div>
                {isPekerjaOver && (
                  <p className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Kinerja pekerja melebihi total volume jadwal!
                  </p>
                )}
              </div>

              {/* Komoditas SOP Loop */}
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-slate-800 border-b pb-2">Pelaksanaan SOP & Hasil Penimbangan</h4>
                
                {modal.detailKomoditas?.map((dk: any, idx: number) => {
                  const sopList = getSopByKomoditas(dk.nama);
                  const isLolos = isAllChecked(idx, sopList);
                  
                  const rawVol = parseFloat(dk.volumeKg) || 0;
                  const estimasi = getEstimasiHasil(dk.nama, rawVol);
                  
                  const timbangAkhir = parseFloat(hasilTimbang[idx]) || 0;
                  const isSesuai = Math.abs(timbangAkhir - estimasi) <= 0.1;
                  const hasPenimbangan = !!hasilTimbang[idx];
                  
                  return (
                    <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-slate-50 px-4 py-3 flex justify-between items-center border-b border-slate-200">
                        <span className="font-bold text-slate-800 text-sm">{dk.nama}</span>
                        <div className="flex gap-2">
                          <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                            Vol Awal: {dk.volumeKg} Kg
                          </span>
                          <span className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                            Estimasi Hasil Jadi: {estimasi.toFixed(1)} Kg
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-4 space-y-5">
                        {/* SOP Checklist */}
                        <div>
                          <p className="text-xs font-semibold text-slate-500 mb-2">Checklist SOP (Wajib centang semua untuk lulus QC):</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {sopList.map((step, sIdx) => (
                              <label key={sIdx} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-50 p-1.5 rounded-md transition-colors border border-transparent hover:border-slate-100">
                                <input
                                  type="checkbox"
                                  checked={checklist[idx]?.[step] || false}
                                  onChange={(e) => handleCheckbox(idx, step, e.target.checked)}
                                  className="w-4 h-4 text-emerald-500 rounded border-gray-300 focus:ring-emerald-400"
                                />
                                <span className="text-slate-700 font-medium">{step}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Hasil Penimbangan & Catatan QC */}
                        <div className={`p-4 rounded-xl border ${(!isLolos || (hasPenimbangan && !isSesuai)) ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Input Penimbangan Akhir selalu ada (karena step terakhir biasanya penimbangan) */}
                            <div>
                              <label className="text-xs font-bold text-slate-700 block mb-1">Hasil Penimbangan Akhir <span className="text-red-500">*</span></label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.1"
                                  value={hasilTimbang[idx] || ''}
                                  onChange={(e) => setHasilTimbang(prev => ({...prev, [idx]: e.target.value}))}
                                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 pr-8 font-bold text-slate-800"
                                  placeholder={`Ekspektasi: ${estimasi.toFixed(1)}`}
                                />
                                <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-bold">Kg</span>
                              </div>
                            </div>
                            
                            {/* Input Catatan (jika tidak lolos SOP atau berat melenceng) */}
                            {(!isLolos || (hasPenimbangan && !isSesuai)) && (
                              <div>
                                <label className="text-[11px] font-bold text-red-700 block mb-1 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" /> Catatan QC (Reject / Tidak Lolos / Susut) <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                  value={catatanGagal[idx] || ''}
                                  onChange={(e) => setCatatanGagal(prev => ({...prev, [idx]: e.target.value}))}
                                  placeholder="Contoh: Sayur busuk 2kg, atau penyusutan air berlebih..."
                                  className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 resize-none"
                                  rows={1}
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Hasil Kemasan Jika Lolos */}
                        {isLolos && hasPenimbangan && (
                          <div className="bg-emerald-50/30 border border-emerald-100 p-4 rounded-xl mt-3">
                            <div className="flex items-center gap-2 text-emerald-800 text-sm font-bold mb-3 border-b border-emerald-100 pb-2">
                              <Package className="w-4 h-4" /> Detail Kemasan Hasil Produksi
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* 1kg */}
                              <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                <label className="text-xs font-bold text-slate-600 block mb-1">Kemasan 1 kg</label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    value={kemasan1kg[idx] || ''}
                                    onChange={(e) => setKemasan1kg(prev => ({...prev, [idx]: e.target.value}))}
                                    className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm"
                                    placeholder="0"
                                  />
                                  <span className="text-[10px] font-bold text-slate-500 w-12">pack</span>
                                </div>
                                <div className="text-[10px] text-emerald-600 mt-1 font-semibold text-right">
                                  = {(parseFloat(kemasan1kg[idx]) || 0) * 1} kg
                                </div>
                              </div>

                              {/* 2.5kg */}
                              <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                <label className="text-xs font-bold text-slate-600 block mb-1">Kemasan 2.5 kg</label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    value={kemasan2_5kg[idx] || ''}
                                    onChange={(e) => setKemasan2_5kg(prev => ({...prev, [idx]: e.target.value}))}
                                    className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm"
                                    placeholder="0"
                                  />
                                  <span className="text-[10px] font-bold text-slate-500 w-12">pack</span>
                                </div>
                                <div className="text-[10px] text-emerald-600 mt-1 font-semibold text-right">
                                  = {(parseFloat(kemasan2_5kg[idx]) || 0) * 2.5} kg
                                </div>
                              </div>

                              {/* Custom */}
                              <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                <label className="text-xs font-bold text-slate-600 block mb-1">Kemasan Custom</label>
                                <div className="flex gap-2">
                                  <div>
                                    <input
                                      type="number"
                                      value={kemasanCustomSize[idx] || ''}
                                      onChange={(e) => setKemasanCustomSize(prev => ({...prev, [idx]: e.target.value}))}
                                      className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm"
                                      placeholder="Ukuran (kg)"
                                      step="0.1"
                                    />
                                  </div>
                                  <div>
                                    <input
                                      type="number"
                                      value={kemasanCustomPack[idx] || ''}
                                      onChange={(e) => setKemasanCustomPack(prev => ({...prev, [idx]: e.target.value}))}
                                      className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm"
                                      placeholder="Pack"
                                    />
                                  </div>
                                </div>
                                <div className="text-[10px] text-emerald-600 mt-1 font-semibold text-right">
                                  = {(parseFloat(kemasanCustomPack[idx]) || 0) * (parseFloat(kemasanCustomSize[idx]) || 0)} kg
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 bg-emerald-100 p-2 rounded-lg text-center font-bold text-emerald-900 text-xs border border-emerald-200">
                              Total Berat Semua Kemasan: {calculateTotalPkgKg(idx)} Kg
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Kamera Bukti Foto */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                <h4 className="font-bold text-sm text-slate-800 mb-2 flex items-center gap-1.5">
                  <Camera className="w-4 h-4" /> Bukti Foto Produksi (Opsional)
                </h4>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-100 px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 transition-colors shadow-sm"
                  >
                    <Camera className="w-4 h-4" /> Buka Kamera / Pilih Foto
                  </button>
                  {fotoBukti && (
                    <div className="relative group">
                      <img src={fotoBukti} alt="Bukti" className="h-16 w-16 object-cover rounded-lg border border-slate-300 shadow-sm" />
                      <button 
                        onClick={() => setFotoBukti(null)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 flex gap-3 justify-end border-t border-slate-200">
              <button
                onClick={() => setModal(null)}
                className="px-5 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !isFormValid}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm flex items-center gap-2"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
                ) : (
                  <><Package className="w-4 h-4" /> Selesaikan Produksi</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PemrosesanSortirPage;
