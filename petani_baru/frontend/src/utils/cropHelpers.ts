/**
 * Helper to calculate active crop planting progress.
 * Consistent across Petani, Kepala Petani, and Admin dashboards.
 */
export const hitungProgressTanaman = (
  tanggalTanam: string,
  estimasiPanen: string,
  statusVerifikasi?: string
): number => {
  if (statusVerifikasi === 'pending' || statusVerifikasi === 'rejected') {
    return 0;
  }

  const tanam = new Date(tanggalTanam);
  const panen = new Date(estimasiPanen);
  const today = new Date(); // Real current system date

  const total = panen.getTime() - tanam.getTime();
  if (total <= 0) return 0;

  const elapsed = today.getTime() - tanam.getTime();
  let progress = Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));

  // If harvest is 14 days or less away, treat as 100% (Siap Panen)
  const selisih = panen.getTime() - today.getTime();
  const hariMenujuPanen = Math.ceil(selisih / (1000 * 60 * 60 * 24));

  if (progress >= 100 || hariMenujuPanen <= 14) {
    progress = 100;
  }

  return progress;
};
