import prisma from '../db';
import { mapPickup } from '../utils/mappers';

export async function createPengajuanJual(data: any) {
  const {
    id, petaniId, petaniNama, komoditasId, komoditasNama, beratEstimasiKg,
    tanggalSiapPickup, fotoPanen, tanamanAktifId, lahanId, lahanNama,
    hargaAcuanKg, estimasiPendapatan, catatanPetani, metodePembayaran
  } = data;

  const petani = await prisma.petani.findUnique({ where: { id: petaniId } });
  const newPengajuan = await prisma.pengajuanJual.create({
    data: {
      id,
      petaniId,
      petaniNama,
      komoditasId,
      komoditasNama,
      beratEstimasiKg: parseFloat(beratEstimasiKg),
      tanggalSiapPickup,
      fotoPanen: fotoPanen || '🌾',
      status: 'pending',
      tanggalPengajuan: new Date().toISOString(),
      tanamanAktifId,
      lahanId,
      lahanNama,
      hargaAcuanKg: hargaAcuanKg ? parseFloat(hargaAcuanKg) : null,
      estimasiPendapatan: estimasiPendapatan ? parseFloat(estimasiPendapatan) : null,
      catatanPetani,
      metodePembayaran,
      gudangTujuanId: petani?.gudangTujuanId,
      gudangTujuanNama: petani?.gudangTujuanNama,
    }
  });
  return newPengajuan;
}

export async function verifyPengajuanJual(id: string, data: any) {
  const { status, catatanAdmin } = data;
  const currentPengajuan = await prisma.pengajuanJual.findUnique({ where: { id } });
  if (!currentPengajuan) {
    throw { status: 404, message: 'Pengajuan tidak ditemukan' };
  }

  let targetStatus = status;
  let isAutoPickup = false;
  let customPesan = `Pengajuan jual ${currentPengajuan.komoditasNama} Anda statusnya kini: ${status}. ${catatanAdmin ? `Catatan: ${catatanAdmin}` : ''}`;

  if (status === 'approved' && currentPengajuan.beratEstimasiKg < 300) {
    targetStatus = 'pickup_dijadwalkan';
    isAutoPickup = true;
    customPesan = `Pengajuan jual ${currentPengajuan.komoditasNama} Anda disetujui! Karena berat di bawah 300kg, silakan antar hasil panen Anda langsung ke Gudang Agro Jabar pada tanggal ${currentPengajuan.tanggalSiapPickup}.`;
  }

  const updated = await prisma.pengajuanJual.update({
    where: { id },
    data: {
      status: targetStatus,
      catatanAdmin
    }
  });

  if (isAutoPickup) {
    const pickupId = `PKP_AUTO_${Date.now().toString().slice(-6)}`;
    await prisma.pickup.create({
      data: {
        id: pickupId,
        pengajuanJualId: updated.id,
        petaniId: updated.petaniId,
        petaniNama: updated.petaniNama,
        komoditasNama: updated.komoditasNama,
        alamatPickup: updated.lahanNama || 'Diantar Mandiri',
        tanggalPickup: updated.tanggalSiapPickup,
        driverNama: 'Petani (Mandiri)',
        driverNoHp: '-',
        armada: 'Pengantaran Mandiri',
        platNomor: '-',
        status: 'dijadwalkan',
      }
    });

    await prisma.pembayaran.create({
      data: {
        id: `PAY_${Date.now().toString().slice(-6)}`,
        pickupId: pickupId,
        petaniId: updated.petaniId,
        petaniNama: updated.petaniNama,
        komoditasNama: updated.komoditasNama,
        beratKg: 0,
        hargaPerKg: updated.hargaAcuanKg || 0,
        totalBayar: 0,
        tanggalPickup: updated.tanggalSiapPickup,
        status: 'menunggu',
        metodeBayar: updated.metodePembayaran || 'TDF',
        nomorInvoice: `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`
      }
    });
  }

  await prisma.notifikasi.create({
    data: {
      id: `NTF_${Date.now()}`,
      judul: status === 'rejected' ? 'Pengajuan Jual Ditolak' : 'Pengajuan Jual Diupdate',
      pesan: customPesan,
      tanggal: new Date().toISOString(),
      dibaca: false,
      tipe: status === 'rejected' ? 'danger' : 'success'
    }
  });

  return updated;
}

export async function createPickup(data: any) {
  const {
    id, pengajuanJualId, petaniId, petaniNama, komoditasNama,
    alamatPickup, tanggalPickup, driverNama, driverNoHp, armada, platNomor
  } = data;

  const newPickup = await prisma.pickup.create({
    data: {
      id,
      pengajuanJualId,
      petaniId,
      petaniNama,
      komoditasNama,
      alamatPickup,
      tanggalPickup,
      driverNama,
      driverNoHp,
      armada,
      platNomor,
      status: 'dijadwalkan',
    }
  });

  await prisma.pengajuanJual.update({
    where: { id: pengajuanJualId },
    data: { status: 'pickup_dijadwalkan' }
  });

  const pj = await prisma.pengajuanJual.findUnique({ where: { id: pengajuanJualId } });
  const hargaAcuan = pj?.hargaAcuanKg || 0;
  await prisma.pembayaran.create({
    data: {
      id: `PAY_${Date.now().toString().slice(-6)}`,
      pickupId: id,
      petaniId,
      petaniNama,
      komoditasNama,
      beratKg: 0,
      hargaPerKg: hargaAcuan,
      totalBayar: 0,
      tanggalPickup,
      status: 'menunggu',
      metodeBayar: pj?.metodePembayaran || 'TDF',
      nomorInvoice: `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`
    }
  });

  await prisma.notifikasi.create({
    data: {
      id: `NTF_${Date.now()}`,
      judul: 'Pickup Dijadwalkan',
      pesan: `Pickup panen ${komoditasNama} dijadwalkan pada ${tanggalPickup} bersama driver ${driverNama} (${platNomor}).`,
      tanggal: new Date().toISOString(),
      dibaca: false,
      tipe: 'success'
    }
  });

  return mapPickup(newPickup);
}

export async function updatePickupStatus(id: string, data: any) {
  const { status, beratTimbangKg, fotoTimbang, gpsLokasi, waktuBerangkat, waktuTiba, waktuSelesai } = data;
  const updated = await prisma.pickup.update({
    where: { id },
    data: {
      status,
      beratTimbangKg: beratTimbangKg ? parseFloat(beratTimbangKg) : undefined,
      fotoTimbang,
      latitude: gpsLokasi?.lat ? parseFloat(gpsLokasi.lat) : undefined,
      longitude: gpsLokasi?.lng ? parseFloat(gpsLokasi.lng) : undefined,
      waktuBerangkat,
      waktuTiba,
      waktuSelesai
    }
  });

  if (status === 'selesai') {
    await prisma.pengajuanJual.update({
      where: { id: updated.pengajuanJualId },
      data: { status: 'proses_timbang' }
    });

    const pay = await prisma.pembayaran.findFirst({ where: { pickupId: id } });
    if (pay && beratTimbangKg) {
      const berat = parseFloat(beratTimbangKg);
      const total = berat * pay.hargaPerKg;
      await prisma.pembayaran.update({
        where: { id: pay.id },
        data: {
          beratKg: berat,
          totalBayar: total,
          status: 'diproses'
        }
      });
    }

    await prisma.jejakPanen.create({
      data: {
        id: `JP_${Date.now().toString().slice(-6)}`,
        petaniId: updated.petaniId,
        pickupId: id,
        komoditasNama: updated.komoditasNama,
        emoji: '🌾',
        beratAwalKg: parseFloat(beratTimbangKg),
        gradeAwal: 'A',
        statusSaatIni: 'qc_selesai',
      }
    });

    const GUDANG_URL = process.env.GUDANG_URL || 'http://localhost:5005';
    const GUDANG_API_KEY = process.env.GUDANG_API_KEY || 'gudang_secret_key_v1';
    const petaniData = await prisma.petani.findUnique({ where: { id: updated.petaniId } });
    fetch(`${GUDANG_URL}/api/webhook/penerimaan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': GUDANG_API_KEY,
      },
      body: JSON.stringify({
        pickupId: id,
        pengajuanJualId: updated.pengajuanJualId,
        petaniId: updated.petaniId,
        petaniNama: updated.petaniNama,
        komoditasNama: updated.komoditasNama,
        beratTimbangKg: parseFloat(beratTimbangKg),
        gudangTujuanId: petaniData?.gudangTujuanId || null,
        timestamp: new Date().toISOString(),
      }),
    })
      .then(() => {
        console.log(`[Pickup→Gudang] Notified gudang: ${updated.komoditasNama} ${beratTimbangKg}kg from ${updated.petaniNama}`);
      })
      .catch((webhookErr: any) => {
        console.error(`[Pickup→Gudang] Failed to notify gudang:`, webhookErr.message);
      });
  }

  return mapPickup(updated);
}

export async function createQC(data: any) {
  const { id, pickupId, petaniNama, komoditasNama, beratDiterimaKg, grade, catatanKerusakan, petugasQC, fotoQC } = data;
  const newQC = await prisma.qualityControl.create({
    data: {
      id,
      pickupId,
      petaniNama,
      komoditasNama,
      beratDiterimaKg: parseFloat(beratDiterimaKg),
      grade,
      catatanKerusakan,
      tanggalQC: new Date().toISOString(),
      petugasQC,
      fotoQC
    }
  });

  const jp = await prisma.jejakPanen.findFirst({ where: { pickupId } });
  if (jp) {
    await prisma.jejakPanen.update({
      where: { id: jp.id },
      data: {
        statusSaatIni: 'qc_selesai',
        gradeAwal: grade,
        beratAwalKg: parseFloat(beratDiterimaKg)
      }
    });

    await prisma.jejakPanenTimeline.create({
      data: {
        jejakPanenId: jp.id,
        status: 'qc_selesai',
        tanggal: new Date().toISOString(),
        lokasi: 'Agro Jabar QC Center',
        keterangan: `Lolos QC Grade ${grade}. Catatan: ${catatanKerusakan || 'Kualitas baik'}`
      }
    });
  }

  return newQC;
}

export async function payPembayaran(data: any) {
  const { id, pickupId, petaniId, petaniNama, komoditasNama, beratKg, hargaPerKg, totalBayar, metodeBayar, buktiTransfer, dibuatOleh } = data;
  const updatedPay = await prisma.pembayaran.update({
    where: { id },
    data: {
      status: 'dibayar',
      tanggalBayar: new Date().toISOString(),
      buktiTransfer,
      dibuatOleh,
      metodeBayar,
    }
  });

  const pick = await prisma.pickup.findUnique({
    where: { id: updatedPay.pickupId }
  });
  if (pick) {
    await prisma.pengajuanJual.update({
      where: { id: pick.pengajuanJualId },
      data: { status: 'selesai' }
    });
  }

  const lastKas = await prisma.bukuKas.findFirst({ orderBy: { tanggal: 'desc' } });
  const saldoSebelumnya = lastKas ? lastKas.saldoAkhir : 500000000;
  const nominal = parseFloat(totalBayar);
  const saldoAkhir = saldoSebelumnya - nominal;

  await prisma.bukuKas.create({
    data: {
      id: `BK_${Date.now().toString().slice(-6)}`,
      tanggal: new Date().toISOString(),
      tipeTransaksi: 'Uang Keluar',
      kategori: 'Pembayaran Petani',
      nominal,
      saldoSebelumnya,
      saldoAkhir,
      keterangan: `Pembayaran panen ${komoditasNama} a.n ${petaniNama} (Inv: ${updatedPay.nomorInvoice})`,
      referensiId: id
    }
  });

  await prisma.notifikasi.create({
    data: {
      id: `NTF_${Date.now()}`,
      judul: 'Pembayaran Berhasil',
      pesan: `Pembayaran panen ${komoditasNama} sebesar Rp ${nominal.toLocaleString()} telah ditransfer. Invoice: ${updatedPay.nomorInvoice}.`,
      tanggal: new Date().toISOString(),
      dibaca: false,
      tipe: 'success'
    }
  });

  return updatedPay;
}

export async function createBukuKas(data: any) {
  const { id, tipeTransaksi, kategori, nominal, keterangan } = data;
  const lastKas = await prisma.bukuKas.findFirst({ orderBy: { tanggal: 'desc' } });
  const saldoSebelumnya = lastKas ? lastKas.saldoAkhir : 500000000;
  const amount = parseFloat(nominal);
  const saldoAkhir = tipeTransaksi === 'Uang Masuk' ? (saldoSebelumnya + amount) : (saldoSebelumnya - amount);

  const newKas = await prisma.bukuKas.create({
    data: {
      id,
      tanggal: new Date().toISOString(),
      tipeTransaksi,
      kategori,
      nominal: amount,
      saldoSebelumnya,
      saldoAkhir,
      keterangan
    }
  });
  return newKas;
}

export async function handleWebhookPenerimaanGudang(data: any) {
  const { pickupId, status, beratDiterimaKg, gradeInfoJson, processedAt } = data;

  if (status === 'STOCKED' && pickupId) {
    const jp = await prisma.jejakPanen.findFirst({ where: { pickupId } });
    
    if (jp) {
      await prisma.jejakPanen.update({
        where: { id: jp.id },
        data: {
          statusSaatIni: 'diterima_gudang'
        }
      });

      let keterangan = 'Telah diterima dan distok oleh Gudang Agro Jabar.';
      if (beratDiterimaKg) {
        keterangan += ` Berat Aktual: ${beratDiterimaKg}kg.`;
      }
      if (gradeInfoJson) {
        try {
          const grades = JSON.parse(gradeInfoJson);
          const gradesStr = grades.map((g: any) => `${g.grade}: ${g.beratKg}kg`).join(', ');
          keterangan += ` Hasil Grading: ${gradesStr}`;
        } catch (e) {}
      }

      await prisma.jejakPanenTimeline.create({
        data: {
          jejakPanenId: jp.id,
          status: 'diterima_gudang',
          tanggal: processedAt || new Date().toISOString(),
          lokasi: 'Gudang Agro Jabar',
          keterangan
        }
      });
      
      // Update Pickup status if needed
      await prisma.pickup.updateMany({
        where: { id: pickupId },
        data: { status: 'selesai' }
      });
    }
  }

  return { success: true };
}
