import prisma from '../db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendRegistrationEmail, sendAccountApprovalEmail } from '../utils/email';

const JWT_SECRET = process.env.JWT_SECRET || 'agro_tani_secret_key_123';

export async function loginPetani(phone: string, passwordPlain: string) {
  const p = await prisma.petani.findFirst({
    where: {
      OR: [
        { noHp: phone },
        { email: phone }
      ]
    }
  });

  if (!p) {
    throw { status: 404, message: 'Petani tidak ditemukan dengan nomor HP atau email tersebut.' };
  }

  const isMatch = await bcrypt.compare(passwordPlain, p.password);
  if (!isMatch) {
    throw { status: 401, message: 'Nomor telepon/email tidak terdaftar atau kata sandi salah.' };
  }

  if (p.statusVerifikasi !== 'approved') {
    let errorMsg = 'Akun Anda belum aktif.';
    if (p.statusVerifikasi === 'pending') {
      errorMsg = 'Akun Anda belum disetujui oleh Admin. Silakan tunggu proses verifikasi selesai.';
    } else if (p.statusVerifikasi === 'rejected') {
      errorMsg = `Pendaftaran Anda ditolak oleh Admin. Catatan: ${p.catatanVerifikasi || '-'}`;
    } else if (p.statusVerifikasi === 'survey') {
      errorMsg = 'Akun Anda sedang dalam proses survey lapangan oleh tim verifikasi.';
    }
    throw { status: 403, message: errorMsg };
  }

  const token = jwt.sign({ id: p.id, role: 'petani' }, JWT_SECRET, { expiresIn: '7d' });
  return { token, petani: p };
}

export async function registerPetani(data: any) {
  const {
    nama, nik, noHp, email, alamat, kecamatan, kabupaten, provinsi, fotoProfil, fotoKtp, password,
    namaLahan, jenisLahan, luasHektar, latitude, longitude, alamatLahan, fotoLahan
  } = data;

  const existing = await prisma.petani.findFirst({ where: { noHp } });
  if (existing) {
    throw { status: 400, message: 'Nomor telepon sudah terdaftar.' };
  }

  const petaniId = `PTN${Date.now()}`;
  const hashedPassword = await bcrypt.hash(password || 'password123', 10);

  const kepalaPetani = await prisma.petani.findFirst({
    where: { role: 'kepala_petani' }
  });

  const newPetani = await prisma.petani.create({
    data: {
      id: petaniId,
      nama,
      nik,
      noHp,
      email,
      alamat,
      kecamatan,
      kabupaten,
      provinsi: provinsi || 'Jawa Barat',
      fotoProfil: fotoProfil || '👨‍🌾',
      fotoKtp: fotoKtp || 'ktp_placeholder.jpg',
      password: hashedPassword,
      statusVerifikasi: 'pending',
      tanggalDaftar: new Date().toISOString(),
      kepalaPetaniId: kepalaPetani ? kepalaPetani.id : null,
    }
  });

  if (namaLahan) {
    const lahanId = `LHN${Date.now()}`;
    await prisma.lahan.create({
      data: {
        id: lahanId,
        petaniId: petaniId,
        namaLahan,
        latitude: parseFloat(latitude || '0'),
        longitude: parseFloat(longitude || '0'),
        alamat: alamatLahan || alamat,
        luasHektar: parseFloat(luasHektar || '0'),
        jenisLahan: jenisLahan || 'sawah',
        kecamatan,
        kabupaten,
        statusVerifikasi: 'pending',
        fotoLahan: fotoLahan || '🌾'
      }
    });
  }

  await prisma.notifikasi.create({
    data: {
      id: `NTF_${Date.now()}`,
      judul: 'Pendaftaran Berhasil',
      pesan: `Selamat datang ${nama}! Pendaftaran Anda sedang dalam proses verifikasi oleh Admin.`,
      tanggal: new Date().toISOString(),
      dibaca: false,
      tipe: 'info'
    }
  });

  if (email) {
    sendRegistrationEmail(email, nama, noHp, password || 'password123')
      .catch((emailErr) => {
        console.error('Pemberitahuan email gagal dikirim:', emailErr);
      });
  }

  const token = jwt.sign({ id: newPetani.id, role: 'petani' }, JWT_SECRET, { expiresIn: '7d' });
  return { token, petani: newPetani };
}

export async function updatePetani(id: string, data: any) {
  const updateData = { ...data };
  if (updateData.password) {
    updateData.password = await bcrypt.hash(updateData.password, 10);
  }
  return prisma.petani.update({
    where: { id },
    data: updateData,
  });
}

export async function verifyPetani(id: string, data: any) {
  const { status, catatanVerifikasi, gudangTujuanId, gudangTujuanNama } = data;
  const updated = await prisma.petani.update({
    where: { id },
    data: {
      statusVerifikasi: status,
      tanggalVerifikasi: new Date().toISOString(),
      catatanVerifikasi,
      gudangTujuanId,
      gudangTujuanNama
    }
  });

  await prisma.notifikasi.create({
    data: {
      id: `NTF_${Date.now()}`,
      judul: status === 'approved' ? 'Verifikasi Petani Disetujui' : 'Verifikasi Petani Ditolak',
      pesan: status === 'approved' 
        ? `Akun Anda telah disetujui. Hub ke gudang: ${gudangTujuanNama || '-'}`
        : `Pendaftaran ditolak: ${catatanVerifikasi || '-'}`,
      tanggal: new Date().toISOString(),
      dibaca: false,
      tipe: status === 'approved' ? 'success' : 'danger'
    }
  });

  if (status === 'approved' && updated.email) {
    sendAccountApprovalEmail(updated.email, updated.nama, gudangTujuanNama || undefined)
      .catch((emailErr) => {
        console.error('Gagal mengirimkan email aktivasi akun:', emailErr);
      });
  }

  return updated;
}
