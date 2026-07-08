import prisma from '../db';
import { mapLahan } from '../utils/mappers';

export async function createLahan(data: any) {
  const { id, petaniId, namaLahan, latitude, longitude, alamat, luasHektar, jenisLahan, kecamatan, kabupaten, fotoLahan } = data;
  const newLahan = await prisma.lahan.create({
    data: {
      id,
      petaniId,
      namaLahan,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      alamat,
      luasHektar: parseFloat(luasHektar),
      jenisLahan,
      kecamatan,
      kabupaten,
      statusVerifikasi: 'pending',
      fotoLahan: fotoLahan || '🌾'
    }
  });
  return mapLahan(newLahan);
}

export async function updateLahan(id: string, data: any) {
  const { namaLahan, luasHektar, jenisLahan, alamat, kecamatan, kabupaten, statusVerifikasi } = data;
  const updated = await prisma.lahan.update({
    where: { id },
    data: {
      namaLahan,
      luasHektar: luasHektar ? parseFloat(luasHektar) : undefined,
      jenisLahan,
      alamat,
      kecamatan,
      kabupaten,
      statusVerifikasi
    }
  });
  return mapLahan(updated);
}

export async function deleteLahan(id: string) {
  await prisma.lahan.delete({ where: { id } });
  return { success: true };
}

export async function verifyLahan(id: string, status: string) {
  const updated = await prisma.lahan.update({
    where: { id },
    data: { statusVerifikasi: status }
  });

  const lahan = await prisma.lahan.findUnique({ where: { id } });
  if (lahan) {
    await prisma.notifikasi.create({
      data: {
        id: `NTF_${Date.now()}`,
        judul: status === 'approved' ? 'Lahan Terverifikasi' : 'Verifikasi Lahan Gagal',
        pesan: `Pengajuan lahan ${lahan.namaLahan} Anda statusnya kini: ${status}`,
        tanggal: new Date().toISOString(),
        dibaca: false,
        tipe: status === 'approved' ? 'success' : 'warning'
      }
    });
  }

  return mapLahan(updated);
}
