import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

// 2. Pack bulk product stock into packaged stock
export const kemaskanProduk = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { produkGudangId, ukuranKg, jumlahKemasan } = req.body;

    if (!produkGudangId || !ukuranKg || !jumlahKemasan) {
      return res.status(400).json({
        statusCode: 400,
        message: 'produkGudangId, ukuranKg, dan jumlahKemasan wajib diisi'
      });
    }

    if (ukuranKg <= 0 || jumlahKemasan <= 0) {
      return res.status(400).json({
        statusCode: 400,
        message: 'ukuranKg dan jumlahKemasan harus lebih besar dari 0'
      });
    }

    // Get product
    const produk = await prisma.produkGudang.findUnique({
      where: { id: produkGudangId }
    });

    if (!produk) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Produk gudang tidak ditemukan'
      });
    }

    const totalKgDibutuhkan = ukuranKg * jumlahKemasan;


    // Execute in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get current total
      const kemasans = await tx.konfigurasiKemasan.findMany({ where: { produkGudangId } });
      const currentTotal = kemasans.reduce((sum, k) => sum + (k.ukuranKg * k.stokKemasan), 0);
      const newTotal = currentTotal + totalKgDibutuhkan;

      // 2. Delete all existing
      await tx.konfigurasiKemasan.deleteMany({ where: { produkGudangId } });

      // 3. Create single new bucket with total kg
      const updatedKemasan = await tx.konfigurasiKemasan.create({
        data: {
          produkGudangId,
          ukuranKg: newTotal,
          stokKemasan: 1,
          isActive: true
        }
      });

      return { updatedKemasan };
    });

    return res.status(200).json({
      statusCode: 200,
      message: `Berhasil mengemas ${jumlahKemasan} unit kemasan ukuran ${ukuranKg}kg (Total: ${totalKgDibutuhkan}kg)`,
      data: {
        kemasan: {
          id: result.updatedKemasan.id,
          ukuranKg: result.updatedKemasan.ukuranKg,
          stokKemasan: result.updatedKemasan.stokKemasan,
          totalKg: result.updatedKemasan.ukuranKg * result.updatedKemasan.stokKemasan
        }
      }
    });

  } catch (error: unknown) {
    console.error('Error packing product:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Terjadi kesalahan internal server saat pengemasan',
      error: (error as Error).message
    });
  }
};
