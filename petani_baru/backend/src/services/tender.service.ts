import prisma from '../db';
import { createPengajuanJual, verifyPengajuanJual } from './transaksi.service';

export async function createTender(data: any) {
  const { id, komoditasId, komoditasNama, kebutuhanKg, periodePanen, tanggalBerakhir, deskripsi, hargaPerKg } = data;
  const newTender = await prisma.tender.create({
    data: {
      id,
      komoditasId,
      komoditasNama,
      kebutuhanKg: parseFloat(kebutuhanKg),
      terpenuhinKg: 0,
      periodePanen,
      tanggalBerakhir,
      status: 'aktif',
      deskripsi,
      hargaPerKg: parseFloat(hargaPerKg)
    }
  });

  await prisma.notifikasi.create({
    data: {
      id: `NTF_${Date.now()}`,
      judul: 'Tender Baru Dibuka',
      pesan: `Tersedia tender ${komoditasNama} ${parseFloat(kebutuhanKg).toLocaleString()}kg untuk panen periode ${periodePanen}.`,
      tanggal: new Date().toISOString(),
      dibaca: false,
      tipe: 'warning'
    }
  });

  return newTender;
}

export async function handlePermintaanPengadaanWebhook(data: any) {
  const {
    permintaanPengadaanId,
    komoditasNama,
    kodeKomoditasGlobal,
    targetKg,
    hargaAcuanPerKg,
    deadlinePanen,
    catatan,
    periode,
    gudangNama,
    trendArah,
    trendPersen
  } = data;

  let tender = await prisma.tender.findUnique({
    where: { id: permintaanPengadaanId }
  });

  if (tender) {
    tender = await prisma.tender.update({
      where: { id: permintaanPengadaanId },
      data: {
        kebutuhanKg: parseFloat(targetKg) || 0,
        hargaPerKg: parseFloat(hargaAcuanPerKg) || 0,
        tanggalBerakhir: deadlinePanen || '',
        deskripsi: catatan ? `[Permintaan Gudang: ${gudangNama || 'AgroGudang'}] ${catatan}` : `[Permintaan Gudang] Kebutuhan pengadaan dari Gudang ${gudangNama || 'AgroGudang'}`,
        periodePanen: periode || '',
        status: 'pending' // Force back to pending on update from Gudang
      }
    });
  } else {
    tender = await prisma.tender.create({
      data: {
        id: permintaanPengadaanId,
        komoditasId: kodeKomoditasGlobal || 'UNKNOWN',
        komoditasNama: komoditasNama || '',
        kebutuhanKg: parseFloat(targetKg) || 0,
        terpenuhinKg: 0,
        hargaPerKg: parseFloat(hargaAcuanPerKg) || 0,
        tanggalBerakhir: deadlinePanen || '',
        deskripsi: catatan ? `[Permintaan Gudang: ${gudangNama || 'AgroGudang'}] ${catatan}` : `[Permintaan Gudang] Kebutuhan pengadaan dari Gudang ${gudangNama || 'AgroGudang'}`,
        periodePanen: periode || '',
        status: 'pending' // Admin needs to verify
      }
    });
  }

  // Notifikasi untuk Admin Petani
  await prisma.notifikasi.create({
    data: {
      id: `NTF_${Date.now()}_${Math.random().toString(36).substring(2,7)}`,
      judul: 'Permintaan Gudang Baru',
      pesan: `Permintaan ${komoditasNama} sebanyak ${targetKg}kg menunggu verifikasi Anda.`,
      tanggal: new Date().toISOString(),
      dibaca: false,
      tipe: 'info'
    }
  });

  return tender;
}

export async function verifyTenderAdmin(id: string, status: string, alasanPenolakan?: string) {
  const tender = await prisma.tender.update({
    where: { id },
    data: {
      status,
      alasanPenolakan: status === 'ditolak' ? (alasanPenolakan || null) : null
    }
  });

  if (status === 'aktif') {
    // 1. Buat Rekomendasi Tanam hanya jika disetujui (aktif)
    const rekId = `REK_${id}`;
    
    const orConditions: any[] = [];
    if (tender.komoditasId !== 'UNKNOWN') {
      orConditions.push({ id: tender.komoditasId });
    }
    orConditions.push({ nama: { contains: tender.komoditasNama, mode: 'insensitive' } });

    const komoditasInfo = await prisma.komoditas.findFirst({
      where: { OR: orConditions }
    });

    const kategori = komoditasInfo ? komoditasInfo.kategori : 'sayuran';
    const supplySekarangKg = komoditasInfo ? komoditasInfo.totalEstimasiProduksiKg : 0;
    const targetKebutuhan = tender.kebutuhanKg;
    const selisihKg = Math.max(0, targetKebutuhan - supplySekarangKg);
    
    let prioritas = 'sedang';
    if (selisihKg > 1000) prioritas = 'tinggi';

    const rekData = {
      komoditasId: komoditasInfo ? komoditasInfo.id : tender.komoditasId,
      komoditasNama: tender.komoditasNama,
      kategori: kategori,
      alasan: tender.deskripsi,
      prioritas: prioritas,
      kebutuhanKg: targetKebutuhan,
      supplySekarangKg: supplySekarangKg,
      selisihKg: selisihKg,
      estimasiHargaJual: tender.hargaPerKg || (komoditasInfo ? komoditasInfo.hargaSaatIni : 0)
    };

    await prisma.rekomendasiTanam.upsert({
      where: { id: rekId },
      update: rekData,
      create: {
        id: rekId,
        ...rekData
      }
    });

    // 2. Distribusi Otomatis ke Petani yang Memiliki Lahan Siap Panen (Komoditas Cocok)
    const crops = await prisma.tanamanAktif.findMany({
      where: {
        komoditasNama: { contains: tender.komoditasNama, mode: 'insensitive' },
        statusVerifikasi: 'approved'
      }
    });

    // Sort by harvest date ascending
    crops.sort((a, b) => new Date(a.estimasiPanen).getTime() - new Date(b.estimasiPanen).getTime());

    let needed = tender.kebutuhanKg;
    // Batas waktu pemrosesan: <= 500kg = 2 hari, > 500kg = 3 hari
    const hari = tender.kebutuhanKg > 500 ? 3 : 2;
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + hari);
    const batasWaktuStr = deadline.toISOString().split('T')[0];

    for (const crop of crops) {
      if (needed <= 0) break;

      const avail = crop.estimasiHasilKg;
      const allocated = Math.min(needed, avail);

      if (allocated > 0) {
        const petaniObj = await prisma.petani.findUnique({ where: { id: crop.petaniId } });
        
        await prisma.tenderPetani.create({
          data: {
            id: `TP_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            tenderId: tender.id,
            petaniId: crop.petaniId,
            petaniNama: petaniObj?.nama || 'Petani',
            kesanggupanKg: allocated,
            statusApproval: 'pending', // Status 'pending' agar muncul di halaman "Pesanan Gudang" petani
            tanggalDaftar: new Date().toISOString(),
            batasWaktu: batasWaktuStr,
            catatanAdmin: `Alokasi otomatis untuk PO ${tender.id}`
          }
        });

        needed -= allocated;
      }
    }
  }

  return tender;
}

export async function createTenderPetani(data: any) {
  const { id, tenderId, petaniId, petaniNama, kesanggupanKg } = data;
  const tp = await prisma.tenderPetani.create({
    data: {
      id,
      tenderId,
      petaniId,
      petaniNama,
      kesanggupanKg: parseFloat(kesanggupanKg),
      statusApproval: 'pending',
      tanggalDaftar: new Date().toISOString()
    }
  });
  return tp;
}

export async function verifyTenderPetani(id: string, data: any) {
  const { status, catatanAdmin } = data;
  const updated = await prisma.tenderPetani.update({
    where: { id },
    data: {
      statusApproval: status,
      catatanAdmin
    }
  });

  const tenderPetani = await prisma.tenderPetani.findUnique({ where: { id } });
  if (tenderPetani && status === 'approved') {
    const tender = await prisma.tender.findUnique({ where: { id: tenderPetani.tenderId } });
    if (tender) {
      const newFulfilled = tender.terpenuhinKg + tenderPetani.kesanggupanKg;
      const reachedTarget = newFulfilled >= tender.kebutuhanKg;
      await prisma.tender.update({
        where: { id: tender.id },
        data: {
          terpenuhinKg: newFulfilled,
          status: reachedTarget ? 'terpenuhi' : 'aktif'
        }
      });

      const approvedResponsesCount = await prisma.tenderPetani.count({
        where: {
          tenderId: tender.id,
          statusApproval: 'approved'
        }
      });

      const GUDANG_URL = process.env.GUDANG_URL || 'http://localhost:5005';
      const GUDANG_API_KEY = process.env.GUDANG_API_KEY || 'gudang_secret_key_v1';
      fetch(`${GUDANG_URL}/api/permintaan-pengadaan/${tender.id}/komitmen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': GUDANG_API_KEY
        },
        body: JSON.stringify({
          totalKomitmenKg: newFulfilled,
          jumlahKepalaPetaniRespon: approvedResponsesCount
        })
      })
        .then(() => {
          console.log(`[Webhook] Sent commitment update to Gudang for tender ${tender.id}: ${newFulfilled} kg`);
        })
        .catch((webhookErr: any) => {
          console.error(`[Webhook] Failed to notify Gudang:`, webhookErr.message);
        });
    }
  }

  return updated;
}

export async function createPurchaseOrder(data: any) {
  const { id, nomorReq, penerimaKontrak, operatorLogistik, tanggalPengajuan, estimasiPengantaran, status, itemsJson } = data;
  const newPO = await prisma.purchaseOrder.create({
    data: {
      id,
      nomorReq,
      penerimaKontrak,
      operatorLogistik: operatorLogistik || 'admin (Admin Gudang)',
      tanggalPengajuan,
      estimasiPengantaran,
      status: status || 'PENDING',
      itemsJson,
    }
  });
  return newPO;
}

export async function updatePurchaseOrder(id: string, data: any) {
  const { status, estimasiPengantaran, penerimaKontrak, itemsJson } = data;
  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      status,
      estimasiPengantaran,
      penerimaKontrak,
      itemsJson,
    }
  });
  return updated;
}

export async function deletePurchaseOrder(id: string) {
  await prisma.purchaseOrder.delete({ where: { id } });
  return { success: true };
}

export async function alokasikanPurchaseOrder(poId: string, payload: any) {
  const { allocations } = payload;
  if (!allocations || !Array.isArray(allocations)) {
    throw { status: 400, message: 'Alokasi tidak valid' };
  }

  const po = await prisma.purchaseOrder.findUnique({ where: { id: poId } });
  if (!po) {
    throw { status: 404, message: 'Purchase Order tidak ditemukan' };
  }

  const results = [];

  for (const alloc of allocations) {
    const { petaniId, tanamanAktifId, beratKg, tanggalPanen } = alloc;

    // 1. Get TanamanAktif details
    const tanaman = await prisma.tanamanAktif.findUnique({ where: { id: tanamanAktifId } });
    if (!tanaman) continue;

    // 2. Get Petani details
    const petani = await prisma.petani.findUnique({ where: { id: petaniId } });
    if (!petani) continue;

    // 3. Get Lahan details
    const lahan = await prisma.lahan.findUnique({ where: { id: tanaman.lahanId } });
    const lahanNama = lahan?.namaLahan || 'Lahan Petani';

    // 4. Get Komoditas current price
    const komoditas = await prisma.komoditas.findUnique({ where: { id: tanaman.komoditasId } });
    const hargaAcuan = komoditas?.hargaSaatIni || 0;

    // 5. Generate PengajuanJual ID
    const pjId = `PJB_ALOC_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    // 6. Create PengajuanJual (it starts as pending)
    const pj = await createPengajuanJual({
      id: pjId,
      petaniId,
      petaniNama: petani.nama,
      komoditasId: tanaman.komoditasId,
      komoditasNama: tanaman.komoditasNama,
      beratEstimasiKg: beratKg,
      tanggalSiapPickup: tanggalPanen,
      fotoPanen: '🌱',
      tanamanAktifId: tanaman.id,
      lahanId: tanaman.lahanId,
      lahanNama,
      hargaAcuanKg: hargaAcuan,
      estimasiPendapatan: beratKg * hargaAcuan,
      catatanPetani: `Alokasi otomatis untuk Purchase Order ${po.nomorReq}`,
      metodePembayaran: 'TDF'
    });

    // 7. Verify / Approve PengajuanJual (this automatically schedules pickup/mandiri if < 300kg)
    await verifyPengajuanJual(pjId, {
      status: 'approved',
      catatanAdmin: `Instruksi Panen berdasarkan Purchase Order ${po.nomorReq}`
    });

    // 8. Create a targeted notification message in the global notifications table
    await prisma.notifikasi.create({
      data: {
        id: `NTF_ALOC_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        judul: 'Instruksi Panen (PO)',
        pesan: `[${petani.nama}] Silakan panen ${tanaman.komoditasNama} ${beratKg}kg di ${lahanNama} paling lambat tanggal ${tanggalPanen} untuk didistribusikan ke gudang berdasarkan orderan ${po.nomorReq}.`,
        tanggal: new Date().toISOString(),
        dibaca: false,
        tipe: 'info'
      }
    });

    results.push(pj);
  }

  // Update PO status to PROSES if it was PENDING
  if (po.status === 'PENDING') {
    await prisma.purchaseOrder.update({
      where: { id: poId },
      data: { status: 'PROSES' }
    });
  }

  return { success: true, processedCount: results.length };
}
