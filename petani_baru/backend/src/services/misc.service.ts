import prisma from '../db';
import { mapLahan, mapTanamanAktif, mapPickup } from '../utils/mappers';

export async function getAllData() {
  const petani = await prisma.petani.findMany({
    orderBy: { id: 'desc' }
  });
  const lahanRaw = await prisma.lahan.findMany({
    orderBy: { id: 'desc' }
  });
  const tanamanRaw = await prisma.tanamanAktif.findMany({
    orderBy: { id: 'desc' }
  });
  const komoditas = await prisma.komoditas.findMany({
    orderBy: { id: 'desc' }
  });
  const hargaKomoditas = await prisma.hargaKomoditas.findMany({
    orderBy: { id: 'desc' }
  });
  const historiHarga = await prisma.historiHarga.findMany({
    orderBy: [{ tanggal: 'desc' }, { id: 'desc' }]
  });
  const pengajuanJual = await prisma.pengajuanJual.findMany({
    orderBy: { id: 'desc' }
  });
  const pickupRaw = await prisma.pickup.findMany({
    orderBy: [{ tanggalPickup: 'desc' }, { id: 'desc' }]
  });
  const pembayaran = await prisma.pembayaran.findMany({
    orderBy: [{ tanggalPickup: 'desc' }, { id: 'desc' }]
  });
  const tender = await prisma.tender.findMany({
    orderBy: { createdAt: 'desc' }
  });
  const tenderPetani = await prisma.tenderPetani.findMany({
    orderBy: [{ tanggalDaftar: 'desc' }, { id: 'desc' }]
  });
  const artikelEdukasi = await prisma.artikelEdukasi.findMany({
    orderBy: [{ tanggalPublish: 'desc' }, { id: 'desc' }]
  });
  const produkBibitPupuk = await prisma.produkBibitPupuk.findMany({
    orderBy: { id: 'desc' }
  });
  const qualityControl = await prisma.qualityControl.findMany({
    orderBy: [{ tanggalQC: 'desc' }, { id: 'desc' }]
  });
  const notifikasi = await prisma.notifikasi.findMany({
    orderBy: [{ tanggal: 'desc' }, { id: 'desc' }]
  });
  const rekomendasiTanam = await prisma.rekomendasiTanam.findMany({
    orderBy: { id: 'desc' }
  });
  const jejakPanenRaw = await prisma.jejakPanen.findMany({
    include: { timeline: true },
    orderBy: { id: 'desc' }
  });
  const bukuKas = await prisma.bukuKas.findMany({
    orderBy: [{ tanggal: 'desc' }, { id: 'desc' }]
  });
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    orderBy: [{ tanggalPengajuan: 'desc' }, { id: 'desc' }]
  });

  const lahan = lahanRaw.map(mapLahan);
  const tanamanAktif = tanamanRaw.map(mapTanamanAktif);
  const pickup = pickupRaw.map(mapPickup);
  const jejakPanen = jejakPanenRaw.map((jp: any) => ({
    id: jp.id,
    petaniId: jp.petaniId,
    pickupId: jp.pickupId,
    komoditasNama: jp.komoditasNama,
    emoji: jp.emoji,
    beratAwalKg: jp.beratAwalKg,
    gradeAwal: jp.gradeAwal,
    statusSaatIni: jp.statusSaatIni,
    timeline: jp.timeline.map((t: any) => ({
      status: t.status,
      tanggal: t.tanggal,
      lokasi: t.lokasi,
      keterangan: t.keterangan ?? undefined,
    }))
  }));

  return {
    petani,
    lahan,
    tanamanAktif,
    komoditas,
    hargaKomoditas,
    historiHarga,
    pengajuanJual,
    pickup,
    pembayaran,
    tender,
    tenderPetani,
    artikelEdukasi,
    produkBibitPupuk,
    qualityControl,
    notifikasi,
    rekomendasiTanam,
    jejakPanen,
    bukuKas,
    purchaseOrders,
  };
}

export async function createEdukasi(data: any) {
  const { id, judul, isi, gambar, kategori, penulis, tipe, urlVideo } = data;
  const newEdu = await prisma.artikelEdukasi.create({
    data: {
      id,
      judul,
      isi,
      gambar,
      kategori,
      tanggalPublish: new Date().toISOString(),
      penulis,
      tipe,
      urlVideo
    }
  });
  return newEdu;
}

export async function buyBibitPupuk(data: any) {
  const { items, totalHarga, petaniId } = data;
  for (const item of items) {
    const dbProduct = await prisma.produkBibitPupuk.findUnique({ where: { id: item.id } });
    if (dbProduct) {
      const newStock = Math.max(0, dbProduct.stok - item.quantity);
      await prisma.produkBibitPupuk.update({
        where: { id: item.id },
        data: { stok: newStock }
      });
    }
  }

  await prisma.notifikasi.create({
    data: {
      id: `NTF_${Date.now()}`,
      judul: 'Pembelian Berhasil',
      pesan: `Pembelian bibit/pupuk senilai Rp ${parseFloat(totalHarga).toLocaleString()} sukses. Silakan ambil barang di gudang tujuan.`,
      tanggal: new Date().toISOString(),
      dibaca: false,
      tipe: 'success'
    }
  });

  return { success: true };
}

export async function readNotifikasi(id: string) {
  const updated = await prisma.notifikasi.update({
    where: { id },
    data: { dibaca: true }
  });
  return updated;
}

export async function addJejakPanenTimeline(id: string, data: any) {
  const { status, lokasi, keterangan } = data;
  const jp = await prisma.jejakPanen.findUnique({ where: { id } });
  if (!jp) {
    throw { status: 404, message: 'Jejak panen tidak ditemukan' };
  }

  await prisma.jejakPanen.update({
    where: { id },
    data: { statusSaatIni: status }
  });

  const entry = await prisma.jejakPanenTimeline.create({
    data: {
      jejakPanenId: id,
      status,
      tanggal: new Date().toISOString(),
      lokasi,
      keterangan
    }
  });

  return entry;
}
