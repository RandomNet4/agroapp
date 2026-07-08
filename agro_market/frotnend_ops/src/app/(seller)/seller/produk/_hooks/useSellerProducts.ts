import { useState, useEffect, useCallback, useMemo } from "react";

import { productsApi, storesApi } from "@/lib/ecommerce-api";
import { extractArray } from "@/lib/api-helpers";

export interface ProductItem {
  id: string;
  nama: string;
  namaEtalase?: string;
  masterProdukId?: string;
  masterProduk?: {
    id: string;
    nama: string;
    allowCustomName: boolean;
    namaWajibMengandung?: string;
  };
  status: string;
  gambarUrl?: string;
  category?: { nama: string };
  deskripsi?: string;
  harga: number | string;
  stok: number | string;
  satuan?: string;
  fotoLainnya?: string[];
  grades?: Array<{ id: string; grade: string; stok: number | string }>;
  terjual?: number | string;
  rating?: number | string;
  diskonPersen?: number | string;
}

export interface StoreData {
  id: string;
  nama: string;
  // Other fields can be optional if not explicitly used yet
  [key: string]: any;
}

export const useSellerProducts = () => {
  const [store, setStore] = useState<any>(null); // Keeping any for now as store layout is complex
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      // ── STEP 1: Fetch toko seller ───────────────────────────────────────────
      const storeRes = await storesApi.getMyStore();
      const storeData =
        extractArray<StoreData>(storeRes)[0] ||
        storeRes?.data?.data ||
        storeRes?.data;

      console.log("[useSellerProducts] storeRes.data:", storeRes?.data);
      console.log("[useSellerProducts] storeData resolved:", storeData);
      console.log("[useSellerProducts] storeData.id:", storeData?.id);

      setStore(storeData);

      if (!storeData?.id) {
        console.warn(
          "[useSellerProducts] ❌ storeData.id tidak ditemukan — skip fetch produk",
        );
        return;
      }

      // ── STEP 2: Fetch semua produk toko (termasuk INACTIVE) ─────────────────
      const prodRes = await productsApi.getAllByStore(storeData.id, {
        limit: 100,
      });

      console.log("[useSellerProducts] prodRes.data (raw):", prodRes?.data);

      const dataArray = extractArray<ProductItem>(prodRes);

      console.log(
        "[useSellerProducts] produk di-parse:",
        dataArray.length,
        "items",
      );
      if (dataArray.length === 0) {
        console.warn(
          "[useSellerProducts] ⚠️ Array produk kosong! Cek apakah ProdukEcom sudah dibuat di database.",
        );
      }

      setProducts(dataArray);
    } catch (error) {
      console.error("[useSellerProducts] ❌ Error fetch:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => fetchData(false)); // Already loading by default
  }, [fetchData]);

  const handleToggleStatus = async (product: ProductItem) => {
    const newStatus = product.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setActionLoadingId(product.id);
    try {
      await productsApi.updateStatus(product.id, newStatus);
      await fetchData();
    } catch (error) {
      console.error("Failed to toggle status:", error);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemoveFromEtalase = async (id: string) => {
    if (
      !confirm(
        "Yakin turunkan produk ini dari etalase? (Produk akan tetap ada di Storage)",
      )
    )
      return;
    setActionLoadingId(id);
    try {
      await productsApi.updateStatus(id, "DRAFT");
      await fetchData();
    } catch (error) {
      console.error("Failed to remove from etalase:", error);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAddToEtalase = async (id: string) => {
    setActionLoadingId(id);
    try {
      await productsApi.updateStatus(id, "ACTIVE");
      await fetchData();
    } catch (error) {
      console.error("Failed to add to etalase:", error);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUpdateProduct = async (
    id: string,
    data: Partial<ProductItem>,
  ) => {
    try {
      await productsApi.update(id, data);
      await fetchData();
    } catch (error) {
      console.error("Failed to update product:", error);
      throw error;
    }
  };

  const filteredEtalase = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.nama.toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        filterStatus === "semua" ||
        p.status.toLowerCase() === filterStatus.toLowerCase();
      // Show all products except DRAFT (DRAFT is for storage only)
      return matchSearch && matchStatus && p.status !== "DRAFT";
    });
  }, [products, search, filterStatus]);

  const filteredStorage = useMemo(() => {
    return products.filter((p) =>
      p.nama.toLowerCase().includes(search.toLowerCase()),
    );
  }, [products, search]);

  return {
    store,
    products,
    loading,
    search,
    setSearch,
    filterStatus,
    setFilterStatus,
    actionLoadingId,
    filteredEtalase,
    filteredStorage,
    handleToggleStatus,
    handleRemoveFromEtalase,
    handleAddToEtalase,
    handleUpdateProduct,
    refresh: fetchData,
  };
};
