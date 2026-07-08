"use client";

import { useState } from "react";
import { Search, Loader2, AlertCircle, PackageOpen } from "lucide-react";

import { useSellerProducts, ProductItem } from "./_hooks/useSellerProducts";
import EtalaseCard from "./_components/EtalaseCard";
import SellerProductHeader from "./_components/SellerProductHeader";
import EditProductModal from "./_components/EditProductModal";

const ProdukSayaPage: React.FC = () => {
  // Hook
  const {
    store,
    loading,
    search,
    setSearch,
    filterStatus,
    setFilterStatus,
    actionLoadingId,
    filteredEtalase,
    handleToggleStatus,
    handleRemoveFromEtalase,
    handleUpdateProduct,
  } = useSellerProducts();

  // Local UI State
  const [editProduct, setEditProduct] = useState<ProductItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEditSubmit = async (formData: {
    harga: number | string;
    deskripsi: string;
    images: Array<{ value: string }>;
  }) => {
    if (!editProduct) return;
    setIsSubmitting(true);
    try {
      await handleUpdateProduct(editProduct.id, {
        harga: Number(formData.harga),
        deskripsi: formData.deskripsi,
        gambarUrl: formData.images[0]?.value || undefined,
        fotoLainnya: formData.images
          .slice(1)
          .map((img: { value: string }) => img.value)
          .filter(Boolean),
      });
      setIsEditModalOpen(false);
    } catch (err: unknown) {
      const error = err as Error;
      alert(error?.message || "Gagal menyimpan perubahan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (s: string) => {
    const status = s.toLowerCase();
    switch (status) {
      case "active":
        return "bg-emerald-50 text-emerald-600 border-emerald-100";
      case "inactive":
        return "bg-amber-50 text-amber-600 border-amber-100";
      case "out_of_stock":
        return "bg-red-50 text-red-600 border-red-100";
      case "draft":
        return "bg-gray-50 text-gray-500 border-gray-100";
      default:
        return "bg-amber-50 text-amber-600 border-amber-100";
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-20 gap-3">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
        <p className="text-gray-400 font-medium animate-pulse">
          Memuat data produk...
        </p>
      </div>
    );
  }

  if (!store || store.error) {
    return (
      <div className="bg-red-50 text-red-600 p-8 rounded-3xl border border-red-100 flex items-center gap-4 max-w-2xl mx-auto mt-10">
        <AlertCircle size={32} />
        <div>
          <h3 className="font-medium text-lg text-red-800">
            Toko Tidak Ditemukan
          </h3>
          <p className="text-sm opacity-80 mt-1">
            Anda belum memiliki toko. Pastikan Anda sudah terdaftar sebagai
            seller.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <SellerProductHeader
        hasWarehouse={!!store.warehouseAdmin}
        warehouseName={store.warehouseName || store.warehouseAdmin?.name}
      />

      {/* Filter Bar */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between lg:items-center">
        <div className="relative group flex-1 max-w-md">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari produk di etalase..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none shadow-sm transition-all text-gray-700 font-normal"
          />
        </div>

        <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
          {[
            { label: "Semua", val: "semua" },
            { label: "Aktif", val: "active" },
            { label: "Nonaktif", val: "inactive" },
            { label: "Habis", val: "out_of_stock" },
          ].map((s) => (
            <button
              key={s.val}
              onClick={() => setFilterStatus(s.val)}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                filterStatus === s.val
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="animate-fade-in">
        {filteredEtalase.length === 0 ? (
          <div className="bg-white rounded-3xl p-20 text-center border border-gray-100 shadow-sm">
            <PackageOpen className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-gray-800 font-medium text-lg">
              Hening di Etalase
            </h3>
            <p className="text-gray-400 text-sm mt-1 font-normal">
              Produk tidak ditemukan atau belum ada item yang diaktifkan.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredEtalase.map((p) => (
              <EtalaseCard
                key={p.id}
                product={p}
                onEdit={(prod) => {
                  setEditProduct(prod);
                  setIsEditModalOpen(true);
                }}
                onToggleStatus={handleToggleStatus}
                onRemoveFromEtalase={handleRemoveFromEtalase}
                isActionLoading={actionLoadingId === p.id}
                statusColor={getStatusColor}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <EditProductModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        product={editProduct}
        onSubmit={handleEditSubmit}
        loading={isSubmitting}
      />
    </div>
  );
};

export default ProdukSayaPage;
