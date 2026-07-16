import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../lib/api';
import {
  Package,
  Edit2,
  Check,
  Loader2,
  X,
  AlertCircle,
  Boxes,
  Weight,
  Filter,
  Sprout,
  Send,
} from 'lucide-react';

interface KemasanItem {
  id: string;
  ukuranKg: number;
  stokKemasan: number;
}

interface ProdukStok {
  id: string;
  nama: string;
  deskripsi: string | null;
  satuan: string;
  hargaGudang: number;
  stok: number;
  gudangId: string;
  gudang: { id: string; kode: string; nama: string };
  kemasan: KemasanItem[];
  masterKomoditas?: { kodeKomoditasGlobal?: string | null } | null;
  kodeKomoditasGlobal?: string | null;
}

const StokManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState<ProdukStok[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterGudang, setFilterGudang] = useState('');
  const [filterTab, setFilterTab] = useState<'semua' | 'curah' | 'kemasan'>('semua');

  // Edit stok modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProdukStok | null>(null);
  const [editMode, setEditMode] = useState<'tambah' | 'kurang'>('tambah');
  const [editAmount, setEditAmount] = useState<string>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Kemasan modal
  const [kemasanModalOpen, setKemasanModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProdukStok | null>(null);
  const [kemasanMode, setKemasanMode] = useState<'tambah' | 'kurang'>('tambah');
  const [kemasanAmount, setKemasanAmount] = useState<string>('');
  const [kemasanError, setKemasanError] = useState('');
  const [kemasanSuccess, setKemasanSuccess] = useState('');
  const [kemasanSubmitting, setKemasanSubmitting] = useState(false);


  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/produk/staf');
      setProducts(response.data.data || []);
      if (response.data.data?.length > 0 && !filterGudang) {
        setFilterGudang(response.data.data[0].gudangId);
      }
    } catch (err: any) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  // Filtered products
  const warehouses = Array.from(new Map(products.map(p => [p.gudangId, p.gudang])).values());
  const filtered = products.filter(p => {
    if (filterGudang && p.gudangId !== filterGudang) return false;
    if (filterTab === 'curah') return (p.stok || 0) > 0;
    if (filterTab === 'kemasan') return (p.kemasan || []).some(k => k.stokKemasan > 0);
    return true;
  });

  // Stats
  const allFiltered = products.filter(p => !filterGudang || p.gudangId === filterGudang);
  const totalBulk = allFiltered.reduce((s, p) => s + (p.stok || 0), 0);
  const totalKemasan = allFiltered.reduce((s, p) => s + (p.kemasan || []).reduce((ks, k) => ks + k.ukuranKg * k.stokKemasan, 0), 0);
  const totalFisik = totalBulk + totalKemasan;
  const lowStok = allFiltered.filter(p => {
    const t = (p.stok || 0) + (p.kemasan || []).reduce((ks, k) => ks + k.ukuranKg * k.stokKemasan, 0);
    return t > 0 && t < 10;
  });

  // Edit stok handlers
  const openEditModal = (prod: ProdukStok) => {
    setEditingProduct(prod);
    setEditMode('tambah');
    setEditAmount('');
    setError(''); setSuccess('');
    setModalOpen(true);
  };

  const handleUpdateStok = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setError(''); setSuccess(''); setSubmitting(true);
    try {
      const amount = parseFloat(editAmount) || 0;
      if (amount <= 0) throw new Error('Jumlah harus lebih dari 0.');
      
      const currentStok = editingProduct.stok || 0;
      const finalStok = editMode === 'tambah' ? currentStok + amount : currentStok - amount;
      
      if (finalStok < 0) throw new Error('Stok tidak boleh negatif.');

      await api.patch(`/produk/admin/${editingProduct.id}`, {
        gudangId: editingProduct.gudangId,
        nama: editingProduct.nama,
        deskripsi: editingProduct.deskripsi,
        satuan: editingProduct.satuan,
        hargaGudang: editingProduct.hargaGudang,
        stok: finalStok,
      });
      setSuccess('Stok berhasil diperbarui.');
      await fetchProducts();
      setTimeout(() => setModalOpen(false), 800);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Gagal memperbarui stok.');
    } finally { setSubmitting(false); }
  };

  // Kemasan handlers
  const openKemasanModal = (prod: ProdukStok) => {
    setSelectedProduct(prod);
    setKemasanMode('tambah');
    setKemasanAmount('');
    setKemasanError(''); setKemasanSuccess('');
    setKemasanModalOpen(true);
  };

  const handleKelolaKemasan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setKemasanError(''); setKemasanSuccess(''); setKemasanSubmitting(true);
    try {
      const amount = parseFloat(kemasanAmount) || 0;
      if (amount <= 0) throw new Error('Jumlah harus lebih dari 0.');

      const endpoint = kemasanMode === 'tambah' ? '/kemasan/kemaskan' : '/kemasan/bongkar';
      const response = await api.post(endpoint, {
        produkGudangId: selectedProduct.id,
        ukuranKg: 1,
        jumlahKemasan: amount,
      });
      setKemasanSuccess(response.data.message || 'Operasi berhasil.');
      await fetchProducts();
      setTimeout(() => setKemasanModalOpen(false), 1000);
    } catch (err: any) {
      setKemasanError(err.response?.data?.message || err.message || 'Gagal.');
    } finally { setKemasanSubmitting(false); }
  };

  // Minta ke petani (permintaan pengadaan)
  const openPetaniModal = (prod: ProdukStok) => {
    const prefix = location.pathname.startsWith('/admin') ? '/admin' : '/kepala-gudang';
    navigate(`${prefix}/ajukan-kebutuhan`, { state: { activeTab: 'manual' } });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Manajemen Stok Gudang</h1>
        <p className="text-xs text-slate-400 mt-0.5">Kelola stok sayur segar dan frozen produk</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-100 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Stok Sayur Segar (Bulk)</p>
              <p className="text-xl font-bold text-slate-800 mt-1">{totalBulk.toLocaleString('id-ID')} <span className="text-sm font-medium text-slate-400">kg</span></p>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-xl">
              <Weight className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Belum dikemas, masih dalam bentuk sayur segar</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Stok Frozen</p>
              <p className="text-xl font-bold text-slate-800 mt-1">{totalKemasan.toLocaleString('id-ID')} <span className="text-sm font-medium text-slate-400">kg</span></p>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-xl">
              <Boxes className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Sudah dikemas dalam berbagai ukuran</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Total Stok Fisik</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">{totalFisik.toLocaleString('id-ID')} <span className="text-sm font-medium text-slate-400">kg</span></p>
            </div>
            <div className="p-2.5 bg-blue-50 rounded-xl">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Sayur Segar + Frozen total semua produk</p>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStok.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-red-700">Stok Rendah</p>
            <p className="text-[11px] text-red-600 mt-0.5">{lowStok.length} produk memiliki stok &lt; 10 kg: {lowStok.map(p => p.nama).join(', ')}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Warehouse filter */}
        {warehouses.length > 1 && (
          <select
            value={filterGudang}
            onChange={(e) => setFilterGudang(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
          >
            <option value="">Semua Gudang</option>
            {warehouses.map((w: any) => (
              <option key={w.id} value={w.id}>{w.nama}</option>
            ))}
          </select>
        )}

        {/* Tab filter */}
        <div className="flex gap-1">
          {([
            { key: 'semua', label: 'Semua' },
            { key: 'curah', label: 'Sayur Segar (Belum Kemas)' },
            { key: 'kemasan', label: 'Sudah Frozen' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterTab === tab.key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-[11px] text-slate-400 ml-auto">
          <Filter size={11} className="inline mr-1" />
          {filtered.length} produk
        </span>
      </div>

      {/* Product Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-100 rounded-2xl">
          <Package className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-400 font-medium">Tidak ada produk yang cocok</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((prod) => {
            const stokBulk = prod.stok || 0;
            const kemasanItems = prod.kemasan || [];
            const totalKemasanKg = kemasanItems.reduce((s, k) => s + k.ukuranKg * k.stokKemasan, 0);
            const totalProduk = stokBulk + totalKemasanKg;
            const isLow = totalProduk > 0 && totalProduk < 10;

            return (
              <div key={prod.id} className={`bg-white border rounded-2xl p-4 ${isLow ? 'border-red-200' : 'border-slate-100'}`}>
                {/* Top row: product info + actions */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-800">{prod.nama}</h3>
                      {isLow && <span className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">RENDAH</span>}
                    </div>
                    {prod.deskripsi && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{prod.deskripsi}</p>}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] text-slate-400">Satuan: <span className="font-semibold text-slate-600">{prod.satuan}</span></span>
                      <span className="text-[10px] text-slate-400">Harga: <span className="font-semibold text-amber-600">Rp {prod.hargaGudang.toLocaleString('id-ID')}/{prod.satuan}</span></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => openEditModal(prod)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-[11px] font-medium inline-flex items-center gap-1"
                    >
                      <Edit2 size={11} /> Edit Stok Segar
                    </button>
                    <button
                      onClick={() => openKemasanModal(prod)}
                      className="px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[11px] font-medium inline-flex items-center gap-1"
                    >
                      <Package size={11} /> Edit Stok Frozen
                    </button>
                    <button
                      onClick={() => openPetaniModal(prod)}
                      className="px-2.5 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 rounded-lg text-[11px] font-medium inline-flex items-center gap-1"
                    >
                      <Sprout size={11} /> Minta ke Petani
                    </button>
                  </div>
                </div>

                {/* Stock breakdown */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {/* Curah */}
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] text-emerald-600 font-semibold uppercase">Sayur Segar</p>
                    <p className="text-base font-bold text-emerald-700 mt-0.5">{stokBulk.toLocaleString('id-ID')}</p>
                    <p className="text-[9px] text-emerald-500">kg (belum dikemas)</p>
                  </div>

                  {/* Kemasan */}
                  <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] text-amber-600 font-semibold uppercase">Frozen</p>
                    <p className="text-base font-bold text-amber-700 mt-0.5">{totalKemasanKg.toLocaleString('id-ID')}</p>
                    <p className="text-[9px] text-amber-500">kg total kemasan</p>
                  </div>
                </div>

                {/* Kemasan detail breakdown */}
                <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
                  <span className="px-2 py-1 bg-amber-50 border border-amber-100 text-amber-700 text-[10px] font-semibold rounded">
                    1kg: {kemasanItems.find(k => k.ukuranKg === 1)?.stokKemasan || 0} pack
                  </span>
                  <span className="px-2 py-1 bg-amber-50 border border-amber-100 text-amber-700 text-[10px] font-semibold rounded">
                    2,5kg: {kemasanItems.find(k => k.ukuranKg === 2.5)?.stokKemasan || 0} pack
                  </span>
                  <span className="px-2 py-1 bg-amber-50 border border-amber-100 text-amber-700 text-[10px] font-semibold rounded">
                    Custom: {kemasanItems.filter(k => k.ukuranKg !== 1 && k.ukuranKg !== 2.5).reduce((sum, k) => sum + k.stokKemasan, 0)} pack
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal - Update Stok Bulk */}
      {modalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 relative space-y-4 shadow-xl">
            <button onClick={() => setModalOpen(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
              <X size={16} />
            </button>

            <div>
              <h3 className="text-base font-bold text-slate-800">Update Stok Sayur Segar (Bulk)</h3>
              <p className="text-xs text-slate-400 mt-0.5">{editingProduct.nama}</p>
            </div>

            {error && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium">{error}</div>}
            {success && <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-xs text-green-600 font-medium flex items-center gap-1.5"><Check size={14} />{success}</div>}

            <form onSubmit={handleUpdateStok} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">
                  Stok Sayur Segar Saat Ini: {editingProduct.stok || 0} {editingProduct.satuan}
                </label>
                
                <div className="flex bg-slate-100 p-1 rounded-xl mb-3">
                  <button 
                    type="button" 
                    onClick={() => setEditMode('tambah')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${editMode === 'tambah' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Tambah Stok
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setEditMode('kurang')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${editMode === 'kurang' ? 'bg-white shadow-sm text-red-700' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Hapus Stok
                  </button>
                </div>
                
                <div className="relative">
                  <input
                    type="number" required min="0" step="0.1"
                    placeholder={`Berapa kg yang ingin di${editMode === 'tambah' ? 'tambah' : 'hapus'}?`}
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className={`w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 pr-10 ${editMode === 'tambah' ? 'text-emerald-700 focus:ring-emerald-200' : 'text-red-700 focus:ring-red-200'}`}
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">{editingProduct.satuan}</span>
                </div>
              </div>

              <button type="submit" disabled={submitting || !editAmount} className={`w-full py-2.5 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 ${editMode === 'tambah' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (editMode === 'tambah' ? 'Konfirmasi Tambah' : 'Konfirmasi Hapus')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Kelola Kemasan */}
      {kemasanModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 relative space-y-4 shadow-xl">
            <button onClick={() => setKemasanModalOpen(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
              <X size={16} />
            </button>

            <div>
              <h3 className="text-base font-bold text-slate-800">Kelola Kemasan</h3>
              <p className="text-xs text-slate-400 mt-0.5">{selectedProduct.nama} • Stok Kemasan Saat Ini: {(selectedProduct.kemasan || []).reduce((s, k) => s + k.ukuranKg * k.stokKemasan, 0)} kg</p>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl mb-3">
              <button
                type="button"
                onClick={() => { setKemasanMode('tambah'); setKemasanError(''); setKemasanSuccess(''); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${kemasanMode === 'tambah' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Tambah Kemasan
              </button>
              <button
                type="button"
                onClick={() => { setKemasanMode('kurang'); setKemasanError(''); setKemasanSuccess(''); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${kemasanMode === 'kurang' ? 'bg-white shadow-sm text-red-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Hapus Kemasan
              </button>
            </div>

            {kemasanError && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium">{kemasanError}</div>}
            {kemasanSuccess && <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-xs text-green-600 font-medium flex items-center gap-1.5"><Check size={14} />{kemasanSuccess}</div>}

            <form onSubmit={handleKelolaKemasan} className="space-y-4">
              <div>
                <div className="relative">
                  <input
                    type="number" required min="0" step="0.1"
                    placeholder={`Berapa kg yang ingin di${kemasanMode === 'tambah' ? 'tambah' : 'hapus'}?`}
                    value={kemasanAmount}
                    onChange={(e) => setKemasanAmount(e.target.value)}
                    className={`w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 pr-10 ${kemasanMode === 'tambah' ? 'text-emerald-700 focus:ring-emerald-200' : 'text-red-700 focus:ring-red-200'}`}
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">kg</span>
                </div>
              </div>

              <button type="submit" disabled={kemasanSubmitting || !kemasanAmount} className={`w-full py-2.5 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 ${kemasanMode === 'tambah' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                {kemasanSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (kemasanMode === 'tambah' ? 'Konfirmasi Tambah' : 'Konfirmasi Hapus')}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default StokManagementPage;
