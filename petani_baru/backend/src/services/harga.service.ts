import prisma from '../db';

export async function getHargaList() {
  const hargaList = await prisma.hargaKomoditas.findMany({
    orderBy: { tanggalBerlaku: 'desc' },
  });
  const komoditasList = await prisma.komoditas.findMany();

  const namaToKode: Record<string, string> = {
    'Wortel': 'WORTEL',
    'Buncis': 'JAGUNG_MANIS', // Wait, earlier in index.ts: 'Buncis': 'BUNCIS', let's check
  };

  // Wait, let's check the exact mapping in index.ts:
  // 'Wortel': 'WORTEL',
  // 'Buncis': 'BUNCIS',
  // 'Jagung Manis': 'JAGUNG_MANIS',
  // Let's use the correct map:
  const mapNamaToKode: Record<string, string> = {
    'Wortel': 'WORTEL',
    'Buncis': 'BUNCIS',
    'Jagung Manis': 'JAGUNG_MANIS',
  };

  const enriched = hargaList.map((h: any) => {
    const kmd = komoditasList.find((k: any) => k.id === h.komoditasId);
    return {
      ...h,
      kodeKomoditasGlobal: kmd ? (mapNamaToKode[kmd.nama] || kmd.nama.toUpperCase().replace(/\s+/g, '_')) : null,
    };
  });

  return { harga: enriched, komoditas: komoditasList };
}

export async function getHistoriHarga() {
  const histori = await prisma.historiHarga.findMany({
    orderBy: [{ tanggal: 'desc' }, { id: 'desc' }],
  });
  return { histori };
}

export async function updateHargaKomoditas(data: any) {
  const { id, komoditasId, komoditasNama, harga, wilayah, dibuatOleh } = data;
  const tgl = new Date().toISOString();

  const k = await prisma.komoditas.findUnique({ where: { id: komoditasId } });
  const hargaSebelumnya = k ? k.hargaSaatIni : harga;

  await prisma.komoditas.update({
    where: { id: komoditasId },
    data: {
      hargaSaatIni: parseFloat(harga),
      hargaSebelumnya: parseFloat(hargaSebelumnya),
      lastUpdate: tgl,
    }
  });

  const newHarga = await prisma.hargaKomoditas.create({
    data: {
      id,
      komoditasId,
      komoditasNama,
      harga: parseFloat(harga),
      wilayah,
      tanggalBerlaku: tgl,
      dibuatOleh,
    }
  });

  await prisma.historiHarga.create({
    data: {
      id: `HH_${Date.now()}`,
      komoditasId,
      harga: parseFloat(harga),
      tanggal: tgl,
    }
  });

  await prisma.notifikasi.create({
    data: {
      id: `NTF_${Date.now()}`,
      judul: 'Update Harga Komoditas',
      pesan: `Harga ${komoditasNama} disesuaikan menjadi Rp ${parseFloat(harga).toLocaleString()}/kg per ${tgl}.`,
      tanggal: tgl,
      dibaca: false,
      tipe: 'info'
    }
  });

  return newHarga;
}
