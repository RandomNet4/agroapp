import React, { useState, useMemo } from 'react';
import {
  FileText, Wallet, CreditCard, Sprout, Users, Scale, Download,
  Calendar, Filter, RefreshCw, AlertCircle, ShoppingCart
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { formatRupiah, formatTanggal } from '../../data/adminDummy';

type ReportType = 'buku_kas' | 'pembayaran' | 'hasil_panen' | 'tanaman_aktif' | 'data_petani' | 'quality_control';

interface ReportConfig {
  id: ReportType;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
}

const LaporanPage: React.FC = () => {
  const {
    bukuKas,
    pembayaran,
    pengajuanJual,
    tanamanAktif,
    petani,
    lahan,
    qualityControl
  } = useData();

  // State
  const [selectedReport, setSelectedReport] = useState<ReportType>('buku_kas');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Specific Filters
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterKomoditas, setFilterKomoditas] = useState<string>('all');
  const [filterWilayah, setFilterWilayah] = useState<string>('all');

  // Available reports configurations
  const reportsList: ReportConfig[] = [
    {
      id: 'buku_kas',
      title: 'Laporan Keuangan & Buku Kas',
      description: 'Arus kas masuk & keluar, transparansi anggaran, serta catatan operasional BUMD.',
      icon: <Wallet size={22} />,
      color: 'text-emerald-600 border-emerald-100 bg-emerald-50',
      gradient: 'from-emerald-600 to-emerald-700'
    },
    {
      id: 'pembayaran',
      title: 'Laporan Pembayaran Petani',
      description: 'Rekapitulasi pencairan dana pembayaran hasil panen ke petani beserta statusnya.',
      icon: <CreditCard size={22} />,
      color: 'text-blue-600 border-blue-100 bg-blue-50',
      gradient: 'from-blue-600 to-blue-700'
    },
    {
      id: 'hasil_panen',
      title: 'Laporan Pengajuan & Hasil Panen',
      description: 'Statistik volume panen masuk, deviasi berat estimasi vs timbang, dan status pickup.',
      icon: <ShoppingCart size={22} />,
      color: 'text-purple-600 border-purple-100 bg-purple-50',
      gradient: 'from-purple-600 to-purple-700'
    },
    {
      id: 'tanaman_aktif',
      title: 'Laporan Tanaman Aktif & Produksi',
      description: 'Proyeksi ketersediaan pangan di lahan petani dengan estimasi tanggal & hasil panen.',
      icon: <Sprout size={22} />,
      color: 'text-amber-600 border-amber-100 bg-amber-50',
      gradient: 'from-amber-600 to-amber-700'
    },
    {
      id: 'data_petani',
      title: 'Laporan Data & Verifikasi Petani',
      description: 'Informasi demografi petani terdaftar, status verifikasi akun, dan sebaran wilayah.',
      icon: <Users size={22} />,
      color: 'text-indigo-600 border-indigo-100 bg-indigo-50',
      gradient: 'from-indigo-600 to-indigo-700'
    },
    {
      id: 'quality_control',
      title: 'Laporan Kualitas QC Hasil Panen',
      description: 'Analisis tingkat kerusakan dan grading kualitas hasil panen (Grade A, B, C, Reject).',
      icon: <Scale size={22} />,
      color: 'text-rose-600 border-rose-100 bg-rose-50',
      gradient: 'from-rose-600 to-rose-700'
    }
  ];

  // Reset filter when report type changes
  const handleReportChange = (type: ReportType) => {
    setSelectedReport(type);
    setFilterStatus('all');
    setFilterKomoditas('all');
    setFilterWilayah('all');
  };

  // List of unique commodities for filtering
  const uniqueKomoditas = useMemo(() => {
    const list = new Set<string>();
    if (selectedReport === 'pembayaran') {
      pembayaran?.forEach(item => list.add(item.komoditasNama));
    } else if (selectedReport === 'hasil_panen') {
      pengajuanJual?.forEach(item => list.add(item.komoditasNama));
    } else if (selectedReport === 'tanaman_aktif') {
      tanamanAktif?.forEach(item => list.add(item.komoditasNama));
    } else if (selectedReport === 'quality_control') {
      qualityControl?.forEach(item => list.add(item.komoditasNama));
    }
    return Array.from(list);
  }, [selectedReport, pembayaran, pengajuanJual, tanamanAktif, qualityControl]);

  // List of unique regions (Kabupaten) for filtering
  const uniqueWilayah = useMemo(() => {
    const list = new Set<string>();
    if (selectedReport === 'data_petani') {
      petani?.forEach(item => list.add(item.kabupaten));
    }
    return Array.from(list);
  }, [selectedReport, petani]);

  // Main Filtering Logic
  const filteredData = useMemo(() => {
    const checkDateInRange = (dateStr: string) => {
      if (!dateStr) return false;
      const targetDate = new Date(dateStr.substring(0, 10)); // YYYY-MM-DD
      if (startDate) {
        const start = new Date(startDate);
        if (targetDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (targetDate > end) return false;
      }
      return true;
    };

    switch (selectedReport) {
      case 'buku_kas': {
        return (bukuKas || []).filter(item => {
          if (!checkDateInRange(item.tanggal)) return false;
          if (filterStatus !== 'all' && item.tipeTransaksi !== filterStatus) return false;
          return true;
        });
      }
      case 'pembayaran': {
        return (pembayaran || []).filter(item => {
          const dateToCheck = item.tanggalBayar || item.tanggalPickup;
          if (!checkDateInRange(dateToCheck)) return false;
          if (filterStatus !== 'all' && item.status !== filterStatus) return false;
          if (filterKomoditas !== 'all' && item.komoditasNama !== filterKomoditas) return false;
          return true;
        });
      }
      case 'hasil_panen': {
        return (pengajuanJual || []).filter(item => {
          if (!checkDateInRange(item.tanggalPengajuan)) return false;
          if (filterStatus !== 'all' && item.status !== filterStatus) return false;
          if (filterKomoditas !== 'all' && item.komoditasNama !== filterKomoditas) return false;
          return true;
        });
      }
      case 'tanaman_aktif': {
        return (tanamanAktif || []).filter(item => {
          if (!checkDateInRange(item.tanggalTanam)) return false;
          if (filterStatus !== 'all' && item.statusVerifikasi !== filterStatus) return false;
          if (filterKomoditas !== 'all' && item.komoditasNama !== filterKomoditas) return false;
          return true;
        });
      }
      case 'data_petani': {
        return (petani || []).filter(item => {
          if (!checkDateInRange(item.tanggalDaftar)) return false;
          if (filterStatus !== 'all' && item.statusVerifikasi !== filterStatus) return false;
          if (filterWilayah !== 'all' && item.kabupaten !== filterWilayah) return false;
          return true;
        });
      }
      case 'quality_control': {
        return (qualityControl || []).filter(item => {
          if (!checkDateInRange(item.tanggalQC)) return false;
          if (filterStatus !== 'all' && item.grade !== filterStatus) return false;
          if (filterKomoditas !== 'all' && item.komoditasNama !== filterKomoditas) return false;
          return true;
        });
      }
      default:
        return [];
    }
  }, [
    selectedReport,
    startDate,
    endDate,
    filterStatus,
    filterKomoditas,
    filterWilayah,
    bukuKas,
    pembayaran,
    pengajuanJual,
    tanamanAktif,
    petani,
    qualityControl
  ]);

  // Aggregate Stats
  const reportStats = useMemo(() => {
    const totalCount = filteredData.length;
    let mainMetricLabel = 'Total Item';
    let mainMetricValue = `${totalCount} Baris`;

    if (selectedReport === 'buku_kas') {
      const pemasukan = filteredData
        .filter((d: any) => d.tipeTransaksi === 'Uang Masuk')
        .reduce((sum: number, d: any) => sum + d.nominal, 0);
      const pengeluaran = filteredData
        .filter((d: any) => d.tipeTransaksi === 'Uang Keluar')
        .reduce((sum: number, d: any) => sum + d.nominal, 0);
      mainMetricLabel = 'Net Cashflow';
      mainMetricValue = formatRupiah(pemasukan - pengeluaran);
    } else if (selectedReport === 'pembayaran') {
      const totalBayar = filteredData.reduce((sum: number, d: any) => sum + d.totalBayar, 0);
      mainMetricLabel = 'Total Pencairan Dana';
      mainMetricValue = formatRupiah(totalBayar);
    } else if (selectedReport === 'hasil_panen') {
      const totalBerat = filteredData.reduce((sum: number, d: any) => sum + d.beratEstimasiKg, 0);
      mainMetricLabel = 'Total Volume Panen';
      mainMetricValue = `${totalBerat.toLocaleString('id-ID')} Kg`;
    } else if (selectedReport === 'tanaman_aktif') {
      const totalHasil = filteredData.reduce((sum: number, d: any) => sum + d.estimasiHasilKg, 0);
      mainMetricLabel = 'Proyeksi Hasil Panen';
      mainMetricValue = `${totalHasil.toLocaleString('id-ID')} Kg`;
    } else if (selectedReport === 'quality_control') {
      const totalQC = filteredData.reduce((sum: number, d: any) => sum + d.beratDiterimaKg, 0);
      mainMetricLabel = 'Total Berat Lolos QC';
      mainMetricValue = `${totalQC.toLocaleString('id-ID')} Kg`;
    }

    return { totalCount, mainMetricLabel, mainMetricValue };
  }, [selectedReport, filteredData]);

  // Download CSV logic
  const handleDownloadCSV = () => {
    if (filteredData.length === 0) {
      alert('Tidak ada data yang sesuai filter untuk diunduh.');
      return;
    }

    let headers: string[] = [];
    let rows: string[][] = [];
    const filename = `Laporan_${selectedReport}_${new Date().toISOString().substring(0, 10)}`;

    switch (selectedReport) {
      case 'buku_kas':
        headers = ['ID Transaksi', 'Tanggal', 'Tipe Transaksi', 'Kategori', 'Nominal', 'Saldo Sebelum', 'Saldo Akhir', 'Keterangan', 'Ref ID'];
        rows = filteredData.map((item: any) => [
          item.id,
          item.tanggal,
          item.tipeTransaksi,
          item.kategori,
          item.nominal.toString(),
          item.saldoSebelumnya.toString(),
          item.saldoAkhir.toString(),
          item.keterangan,
          item.referensiId || '-'
        ]);
        break;

      case 'pembayaran':
        headers = ['Nomor Invoice', 'Nama Petani', 'Komoditas', 'Berat (Kg)', 'Harga Per Kg', 'Total Pembayaran', 'Metode Bayar', 'Tanggal Pickup', 'Tanggal Bayar', 'Status'];
        rows = filteredData.map((item: any) => [
          item.nomorInvoice,
          item.petaniNama,
          item.komoditasNama,
          item.beratKg.toString(),
          item.hargaPerKg.toString(),
          item.totalBayar.toString(),
          item.metodeBayar,
          item.tanggalPickup,
          item.tanggalBayar || '-',
          item.status
        ]);
        break;

      case 'hasil_panen':
        headers = ['ID Pengajuan', 'Nama Petani', 'Komoditas', 'Berat Estimasi (Kg)', 'Tanggal Pengajuan', 'Tanggal Siap Pickup', 'Metode Bayar', 'Status', 'Estimasi Pendapatan', 'Gudang Tujuan'];
        rows = filteredData.map((item: any) => [
          item.id,
          item.petaniNama,
          item.komoditasNama,
          item.beratEstimasiKg.toString(),
          item.tanggalPengajuan,
          item.tanggalSiapPickup,
          item.metodePembayaran || '-',
          item.status,
          (item.estimasiPendapatan || 0).toString(),
          item.gudangTujuanNama || '-'
        ]);
        break;

      case 'tanaman_aktif':
        headers = ['ID Tanaman', 'Nama Petani', 'Nama Lahan', 'Komoditas', 'Tanggal Tanam', 'Estimasi Panen', 'Estimasi Hasil (Kg)', 'Status Verifikasi', 'Luas Lahan (Ha)'];
        rows = filteredData.map((item: any) => {
          // Resolve farmer and land names from their lists
          const p = petani?.find(x => x.id === item.petaniId);
          const l = lahan?.find(x => x.id === item.lahanId);
          return [
            item.id,
            p ? p.nama : item.petaniId,
            l ? l.namaLahan : item.lahanId,
            item.komoditasNama,
            item.tanggalTanam,
            item.estimasiPanen,
            item.estimasiHasilKg.toString(),
            item.statusVerifikasi,
            (item.luasLahanDigunakan || 0).toString()
          ];
        });
        break;

      case 'data_petani':
        headers = ['ID Petani', 'Nama Petani', 'NIK', 'Nomor HP', 'Email', 'Alamat', 'Kecamatan', 'Kabupaten', 'Tanggal Daftar', 'Status Verifikasi', 'Gudang Tujuan'];
        rows = filteredData.map((item: any) => [
          item.id,
          item.nama,
          `'${item.nik}`, // Single quote prefix to prevent Excel dropping leading zeros
          item.noHp,
          item.email,
          item.alamat,
          item.kecamatan,
          item.kabupaten,
          item.tanggalDaftar,
          item.statusVerifikasi,
          item.gudangTujuanNama || '-'
        ]);
        break;

      case 'quality_control':
        headers = ['ID QC', 'Tanggal QC', 'ID Pickup', 'Nama Petani', 'Komoditas', 'Berat Diterima (Kg)', 'Grade', 'Catatan Kerusakan', 'Petugas QC'];
        rows = filteredData.map((item: any) => [
          item.id,
          item.tanggalQC,
          item.pickupId,
          item.petaniNama,
          item.komoditasNama,
          item.beratDiterimaKg.toString(),
          item.grade,
          item.catatanKerusakan,
          item.petugasQC
        ]);
        break;
    }

    // Convert rows to CSV strings with escaping
    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        row.map(val => {
          const str = val === null || val === undefined ? '' : String(val);
          // If string contains comma, newline or quotes, wrap in quotes and escape quotes
          if (str.includes(',') || str.includes('\n') || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',')
      )
    ].join('\n');

    // Excel needs BOM to open UTF-8 CSV correctly
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Active config
  const activeConfig = useMemo(() => {
    return reportsList.find(r => r.id === selectedReport)!;
  }, [selectedReport]);

  // Preview header mapping
  const previewHeaders = useMemo(() => {
    switch (selectedReport) {
      case 'buku_kas':
        return ['Tanggal', 'Kategori', 'Keterangan', 'Tipe', 'Nominal', 'Saldo Akhir'];
      case 'pembayaran':
        return ['Invoice', 'Petani', 'Komoditas', 'Berat (Kg)', 'Total Bayar', 'Status'];
      case 'hasil_panen':
        return ['ID Pengajuan', 'Petani', 'Komoditas', 'Berat (Kg)', 'Tanggal', 'Status'];
      case 'tanaman_aktif':
        return ['Petani', 'Lahan', 'Komoditas', 'Tgl Tanam', 'Est. Panen', 'Hasil (Kg)'];
      case 'data_petani':
        return ['ID', 'Nama Petani', 'No HP', 'Wilayah', 'Tgl Daftar', 'Status'];
      case 'quality_control':
        return ['Tanggal', 'Petani', 'Komoditas', 'Berat (Kg)', 'Grade', 'QC Petugas'];
    }
  }, [selectedReport]);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FileText size={24} className="text-primary-600" /> Pusat Laporan Admin
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Ekspor data transaksi, logistik, pertanian, dan keuangan ke format Excel/CSV yang siap dianalisis.
          </p>
        </div>
      </div>

      {/* Reports Card Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportsList.map(report => {
          const isSelected = selectedReport === report.id;
          return (
            <button
              key={report.id}
              onClick={() => handleReportChange(report.id)}
              className={`p-5 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden group hover:shadow-md hover:scale-[1.01] ${
                isSelected
                  ? 'bg-white ring-2 ring-primary-500 border-transparent shadow-sm'
                  : 'bg-white border-gray-100 hover:border-gray-300'
              }`}
            >
              {/* Background gradient on active */}
              {isSelected && (
                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${report.gradient} opacity-5 rounded-bl-[100px] pointer-events-none`} />
              )}
              
              <div className="flex gap-4 items-start">
                <div className={`p-3 rounded-xl border ${report.color} group-hover:scale-110 transition-transform duration-300`}>
                  {report.icon}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-800 leading-tight">
                    {report.title}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                    {report.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter and Output Panel */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
        
        {/* Sidebar Filters */}
        <div className="p-6 space-y-5 lg:col-span-1">
          <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
            <Filter size={16} className="text-primary-600" /> Filter Laporan
          </h3>
          
          <div className="space-y-4">
            {/* Start Date */}
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <Calendar size={12} /> Tanggal Mulai
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <Calendar size={12} /> Tanggal Selesai
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
              />
            </div>

            {/* Dynamic Status Filters */}
            {selectedReport === 'buku_kas' && (
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Tipe Transaksi
                </label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                >
                  <option value="all">Semua Tipe</option>
                  <option value="Uang Masuk">Uang Masuk</option>
                  <option value="Uang Keluar">Uang Keluar</option>
                </select>
              </div>
            )}

            {selectedReport === 'pembayaran' && (
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Status Pembayaran
                </label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                >
                  <option value="all">Semua Status</option>
                  <option value="menunggu">Menunggu</option>
                  <option value="diproses">Diproses</option>
                  <option value="dibayar">Dibayar</option>
                  <option value="gagal">Gagal</option>
                </select>
              </div>
            )}

            {selectedReport === 'hasil_panen' && (
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Status Panen
                </label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                >
                  <option value="all">Semua Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Ditolak</option>
                  <option value="survey">Proses Survey</option>
                  <option value="pickup_dijadwalkan">Pickup Dijadwalkan</option>
                  <option value="selesai">Selesai</option>
                </select>
              </div>
            )}

            {selectedReport === 'tanaman_aktif' && (
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Status Verifikasi
                </label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                >
                  <option value="all">Semua Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="survey">Survey</option>
                </select>
              </div>
            )}

            {selectedReport === 'data_petani' && (
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Status Akun
                </label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                >
                  <option value="all">Semua Status</option>
                  <option value="approved">Aktif (Verified)</option>
                  <option value="pending">Menunggu Verifikasi</option>
                  <option value="survey">Proses Survey</option>
                  <option value="rejected">Ditolak</option>
                </select>
              </div>
            )}

            {selectedReport === 'quality_control' && (
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Grade Kualitas
                </label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                >
                  <option value="all">Semua Grade</option>
                  <option value="A">Grade A</option>
                  <option value="B">Grade B</option>
                  <option value="C">Grade C</option>
                  <option value="reject">Reject</option>
                </select>
              </div>
            )}

            {/* Commodity Selector (If applicable) */}
            {['pembayaran', 'hasil_panen', 'tanaman_aktif', 'quality_control'].includes(selectedReport) && (
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Komoditas Pangan
                </label>
                <select
                  value={filterKomoditas}
                  onChange={e => setFilterKomoditas(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                >
                  <option value="all">Semua Komoditas</option>
                  {uniqueKomoditas.map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Region Selector (If Farmer data) */}
            {selectedReport === 'data_petani' && (
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Wilayah Kabupaten
                </label>
                <select
                  value={filterWilayah}
                  onChange={e => setFilterWilayah(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                >
                  <option value="all">Semua Wilayah</option>
                  {uniqueWilayah.map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100 flex gap-2">
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setFilterStatus('all');
                setFilterKomoditas('all');
                setFilterWilayah('all');
              }}
              className="flex-1 py-2 px-3 border border-gray-200 text-gray-500 text-xs font-semibold rounded-xl hover:bg-gray-50 active:scale-95 transition-all text-center flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={12} /> Reset Filter
            </button>
          </div>
        </div>

        {/* Live Preview and Download Container */}
        <div className="p-6 lg:col-span-3 flex flex-col space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Header info */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 bg-primary-50 border border-primary-100 px-2.5 py-1 rounded-full">
                Pratinjau Data
              </span>
              <h2 className="font-bold text-gray-800 text-base mt-2 flex items-center gap-2">
                {activeConfig.title}
              </h2>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadCSV}
                disabled={filteredData.length === 0}
                className={`py-2.5 px-5 text-sm font-semibold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 text-white shadow-lg ${
                  filteredData.length > 0
                    ? `bg-gradient-to-r ${activeConfig.gradient} shadow-primary-500/10 hover:shadow-xl`
                    : 'bg-gray-300 cursor-not-allowed shadow-none'
                }`}
              >
                <Download size={16} /> Unduh Laporan (CSV)
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/50 p-4 border border-gray-100 rounded-2xl">
            <div className="p-3 bg-white border border-gray-50 rounded-xl flex flex-col justify-center">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Jumlah Data Ditemukan
              </span>
              <span className="text-xl font-black text-gray-800 mt-1">
                {reportStats.totalCount} Baris
              </span>
            </div>
            <div className="p-3 bg-white border border-gray-50 rounded-xl flex flex-col justify-center">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {reportStats.mainMetricLabel}
              </span>
              <span className="text-xl font-black text-primary-600 mt-1">
                {reportStats.mainMetricValue}
              </span>
            </div>
          </div>

          {/* Table Preview */}
          <div className="flex-1 overflow-x-auto border border-gray-100 rounded-2xl bg-white max-h-[300px]">
            <table className="w-full text-sm border-collapse text-left">
              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                <tr className="text-gray-500 font-semibold text-xs uppercase tracking-wider">
                  {previewHeaders?.map((h, i) => (
                    <th key={i} className="px-4 py-3 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredData.slice(0, 10).map((item: any, idx: number) => {
                  let cols: React.ReactNode[] = [];
                  switch (selectedReport) {
                    case 'buku_kas':
                      cols = [
                        <td key="1" className="px-4 py-3.5 font-mono text-xs text-gray-500 whitespace-nowrap">{formatTanggal(item.tanggal)}</td>,
                        <td key="2" className="px-4 py-3.5"><span className="px-2 py-0.5 text-[10px] font-semibold bg-gray-100 rounded-full text-gray-700">{item.kategori}</span></td>,
                        <td key="3" className="px-4 py-3.5 text-gray-700 max-w-xs truncate" title={item.keterangan}>{item.keterangan}</td>,
                        <td key="4" className="px-4 py-3.5">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${item.tipeTransaksi === 'Uang Masuk' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                            {item.tipeTransaksi}
                          </span>
                        </td>,
                        <td key="5" className={`px-4 py-3.5 text-right font-semibold ${item.tipeTransaksi === 'Uang Masuk' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {item.tipeTransaksi === 'Uang Masuk' ? `+${formatRupiah(item.nominal)}` : `-${formatRupiah(item.nominal)}`}
                        </td>,
                        <td key="6" className="px-4 py-3.5 text-right font-bold text-gray-800">{formatRupiah(item.saldoAkhir)}</td>
                      ];
                      break;

                    case 'pembayaran':
                      cols = [
                        <td key="1" className="px-4 py-3.5 font-mono text-xs font-bold text-gray-700 whitespace-nowrap">{item.nomorInvoice}</td>,
                        <td key="2" className="px-4 py-3.5 font-medium text-gray-800 whitespace-nowrap">{item.petaniNama}</td>,
                        <td key="3" className="px-4 py-3.5 text-gray-600">{item.komoditasNama}</td>,
                        <td key="4" className="px-4 py-3.5 text-gray-600 text-right">{item.beratKg.toLocaleString('id-ID')} Kg</td>,
                        <td key="5" className="px-4 py-3.5 text-right font-bold text-gray-800">{formatRupiah(item.totalBayar)}</td>,
                        <td key="6" className="px-4 py-3.5">
                          <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                            item.status === 'dibayar' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            item.status === 'diproses' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                            item.status === 'gagal' ? 'bg-red-50 text-red-700 border border-red-100' :
                            'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      ];
                      break;

                    case 'hasil_panen':
                      cols = [
                        <td key="1" className="px-4 py-3.5 font-mono text-xs text-gray-500 whitespace-nowrap">{item.id}</td>,
                        <td key="2" className="px-4 py-3.5 font-medium text-gray-800 whitespace-nowrap">{item.petaniNama}</td>,
                        <td key="3" className="px-4 py-3.5 text-gray-600">{item.komoditasNama}</td>,
                        <td key="4" className="px-4 py-3.5 text-gray-600 text-right">{item.beratEstimasiKg.toLocaleString('id-ID')} Kg</td>,
                        <td key="5" className="px-4 py-3.5 font-mono text-xs text-gray-500 whitespace-nowrap">{formatTanggal(item.tanggalPengajuan)}</td>,
                        <td key="6" className="px-4 py-3.5">
                          <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                            item.status === 'selesai' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            item.status === 'pickup_dijadwalkan' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                            item.status === 'rejected' ? 'bg-red-50 text-red-700 border border-red-100' :
                            'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      ];
                      break;

                    case 'tanaman_aktif': {
                      const p = petani?.find(x => x.id === item.petaniId);
                      const l = lahan?.find(x => x.id === item.lahanId);
                      cols = [
                        <td key="1" className="px-4 py-3.5 font-medium text-gray-800 whitespace-nowrap">{p ? p.nama : item.petaniId}</td>,
                        <td key="2" className="px-4 py-3.5 text-gray-600 whitespace-nowrap">{l ? l.namaLahan : item.lahanId}</td>,
                        <td key="3" className="px-4 py-3.5 text-gray-800 font-semibold">{item.komoditasNama}</td>,
                        <td key="4" className="px-4 py-3.5 font-mono text-xs text-gray-500 whitespace-nowrap">{formatTanggal(item.tanggalTanam)}</td>,
                        <td key="5" className="px-4 py-3.5 font-mono text-xs text-emerald-600 whitespace-nowrap">{formatTanggal(item.estimasiPanen)}</td>,
                        <td key="6" className="px-4 py-3.5 text-right font-semibold text-gray-800">{item.estimasiHasilKg.toLocaleString('id-ID')} Kg</td>
                      ];
                      break;
                    }

                    case 'data_petani':
                      cols = [
                        <td key="1" className="px-4 py-3.5 font-mono text-xs text-gray-500 whitespace-nowrap">{item.id}</td>,
                        <td key="2" className="px-4 py-3.5 font-medium text-gray-800 whitespace-nowrap">{item.nama}</td>,
                        <td key="3" className="px-4 py-3.5 text-gray-600 whitespace-nowrap">{item.noHp}</td>,
                        <td key="4" className="px-4 py-3.5 text-gray-600 whitespace-nowrap">{item.kabupaten}</td>,
                        <td key="5" className="px-4 py-3.5 font-mono text-xs text-gray-500 whitespace-nowrap">{formatTanggal(item.tanggalDaftar)}</td>,
                        <td key="6" className="px-4 py-3.5">
                          <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                            item.statusVerifikasi === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            item.statusVerifikasi === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            item.statusVerifikasi === 'survey' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                            'bg-red-50 text-red-700 border border-red-100'
                          }`}>
                            {item.statusVerifikasi}
                          </span>
                        </td>
                      ];
                      break;

                    case 'quality_control':
                      cols = [
                        <td key="1" className="px-4 py-3.5 font-mono text-xs text-gray-500 whitespace-nowrap">{formatTanggal(item.tanggalQC)}</td>,
                        <td key="2" className="px-4 py-3.5 font-medium text-gray-800 whitespace-nowrap">{item.petaniNama}</td>,
                        <td key="3" className="px-4 py-3.5 text-gray-600">{item.komoditasNama}</td>,
                        <td key="4" className="px-4 py-3.5 text-gray-600 text-right">{item.beratDiterimaKg.toLocaleString('id-ID')} Kg</td>,
                        <td key="5" className="px-4 py-3.5">
                          <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                            item.grade === 'A' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            item.grade === 'B' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                            item.grade === 'C' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                            'bg-red-50 text-red-700 border-red-100'
                          }`}>
                            Grade {item.grade}
                          </span>
                        </td>,
                        <td key="6" className="px-4 py-3.5 text-gray-600 whitespace-nowrap">{item.petugasQC}</td>
                      ];
                      break;
                  }

                  return (
                    <tr key={idx} className="hover:bg-gray-50/50 border-b border-gray-50">
                      {cols}
                    </tr>
                  );
                })}

                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400 bg-gray-50/50">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <AlertCircle size={28} className="text-gray-300 animate-bounce" />
                        <span className="text-xs font-semibold text-gray-400">Tidak ada data riwayat yang cocok dengan filter.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footnote preview */}
          {filteredData.length > 10 && (
            <p className="text-[11px] text-gray-400 font-medium">
              * Menampilkan 10 baris pertama dari total {filteredData.length} records. Tekan tombol <strong>"Unduh Laporan"</strong> untuk mengunduh seluruh baris data.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LaporanPage;
